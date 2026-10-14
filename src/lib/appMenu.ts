export const OPEN_MENU_EVENT = "exo:open-menu";
/** Opens the app menu from anywhere (e.g. the dashboard's More action). */
export const openAppMenu = () => window.dispatchEvent(new Event(OPEN_MENU_EVENT));
