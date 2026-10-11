#!/usr/bin/env python3
"""
Concurrency tests for public.p2p_send. SCRATCH DATABASES ONLY: this script COMMITS
data (3 fake users) and deletes them again at the end.

    pip install psycopg2-binary
    PG_DSN="host=localhost port=5432 user=postgres dbname=scratch" python3 supabase/tests/p2p_send_concurrency.py

Checks, with many simultaneous connections:
  1. 40 parallel sends of 3 USD from a 100 USD wallet: exactly 33 succeed, the rest
     fail with "Insufficient", the sender ends at 1, the sum is constant.
  2. 20 parallel calls with the SAME idempotency key: exactly one transfer happens.
  3. 30 parallel opposite-direction transfers between the same two users (A->B and
     B->A): no deadlock, no lost update, the sum is constant.
"""
import os
import sys
import threading
import uuid

import psycopg2

DSN = os.environ.get("PG_DSN")
if not DSN:
    sys.exit("set PG_DSN to a scratch database")

A, B, C = (str(uuid.uuid4()) for _ in range(3))
tag = uuid.uuid4().hex[:8]


def conn():
    c = psycopg2.connect(DSN)
    c.autocommit = True
    return c


def balance(cur, u):
    cur.execute("select balance from public.wallets where user_id=%s and currency='USD'", (u,))
    return float(cur.fetchone()[0])


def send(sender, recipient, amount, key, results):
    c = conn()
    try:
        cur = c.cursor()
        cur.execute("select public.p2p_send(%s,%s,'USD',%s,%s,null,%s)", (sender, recipient, amount, amount, key))
        results.append(("ok", cur.fetchone()[0]))
    except Exception as e:  # noqa: BLE001
        results.append(("err", str(e).strip().splitlines()[0]))
    finally:
        c.close()


def run(jobs):
    results, threads = [], []
    for args in jobs:
        t = threading.Thread(target=send, args=(*args, results))
        threads.append(t)
        t.start()
    for t in threads:
        t.join()
    return results


def fail(msg):
    print("FAIL:", msg)
    cleanup()
    sys.exit(1)


def cleanup():
    c = conn()
    cur = c.cursor()
    for u in (A, B, C):
        cur.execute("delete from public.transfer_idempotency where user_id=%s", (u,))
        cur.execute("delete from auth.users where id=%s", (u,))
    c.close()


setup = conn()
cur = setup.cursor()
for u, name in ((A, "a"), (B, "b"), (C, "c")):
    cur.execute("insert into auth.users (id, email) values (%s, %s)", (u, f"{name}{tag}@concurrency.test"))
cur.execute("update public.wallets set balance=100 where user_id in (%s,%s,%s) and currency='USD'", (A, B, C))
total_before = sum(balance(cur, u) for u in (A, B, C))

# 1. oversubscribed sender
res = run([(A, f"b{tag}@concurrency.test", 3, f"over-{tag}-{i}") for i in range(40)])
ok = [r for r in res if r[0] == "ok"]
bad = [r for r in res if r[0] == "err"]
if len(ok) != 33 or not all("Insufficient" in r[1] for r in bad):
    fail(f"oversubscribe: ok={len(ok)} errors={set(r[1] for r in bad)}")
if abs(balance(cur, A) - 1) > 1e-9 or abs(balance(cur, B) - 199) > 1e-9:
    fail(f"oversubscribe balances A={balance(cur, A)} B={balance(cur, B)}")
print(f"PASS: 40 parallel sends of 3 from 100 -> {len(ok)} ok, {len(bad)} rejected, A=1, B=199")

# 2. same idempotency key
before_c = balance(cur, C)
res = run([(C, f"b{tag}@concurrency.test", 10, f"same-{tag}") for _ in range(20)])
ids = {r[1] for r in res if r[0] == "ok"}
errs = [r for r in res if r[0] == "err"]
if errs or len(ids) != 1:
    fail(f"same key: ids={ids} errors={errs}")
if abs(balance(cur, C) - (before_c - 10)) > 1e-9:
    fail(f"same key debited more than once: {balance(cur, C)}")
print("PASS: 20 parallel calls with one idempotency key -> exactly one transfer, one shared id")

# 3. opposite directions
jobs = []
for i in range(15):
    jobs.append((C, f"b{tag}@concurrency.test", 1, f"ab-{tag}-{i}"))
    jobs.append((B, f"c{tag}@concurrency.test", 1, f"ba-{tag}-{i}"))
res = run(jobs)
errs = [r for r in res if r[0] == "err"]
if errs:
    fail(f"opposite directions: {errs[:3]}")
print("PASS: 30 parallel opposite-direction transfers -> no deadlock, no errors")

total_after = sum(balance(cur, u) for u in (A, B, C))
if abs(total_after - total_before) > 1e-9:
    fail(f"sum changed {total_before} -> {total_after}")
print(f"PASS: sum of balances constant ({total_before} -> {total_after})")
cleanup()
print("RESULT: ALL PASSED")
