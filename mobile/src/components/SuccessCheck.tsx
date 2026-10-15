import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated';

import { SPRING } from '@/lib/motion';
import { C } from '@/lib/theme';

export function SuccessCheck({ size = 88 }: { size?: number }) {
  return (
    <Animated.View
      entering={ZoomIn.springify().stiffness(SPRING.stiffness).damping(26).reduceMotion(ReduceMotion.System)}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
      <Ionicons name="checkmark" size={size * 0.5} color={C.bg} />
    </Animated.View>
  );
}
