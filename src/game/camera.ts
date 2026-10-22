import { CAMERA } from '../data/camera.ts';
import type { ActionInput, Vec2 } from './action.ts';

export function followOrbit(angle: number, position: Vec2, dt: number, reduced = false): number {
  if (Math.hypot(position.x, position.z) < CAMERA.centerDeadZone) return angle;
  const target = Math.atan2(position.x, position.z);
  const difference = Math.atan2(Math.sin(target - angle), Math.cos(target - angle));
  const eased = difference * (1 - Math.exp(-CAMERA.follow * dt));
  const limit = CAMERA.maxAngularSpeed * (reduced ? .5 : 1) * dt;
  return angle + Math.max(-limit, Math.min(limit, eased));
}

// screen +x = right, +z = back; keep attack/dodge requests unchanged.
export function cameraRelativeInput(input: ActionInput, angle: number): ActionInput {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return { ...input, x: input.x * cos + input.z * sin, z: -input.x * sin + input.z * cos };
}

export function dodgeRotationY(age: number, duration: number, direction: Vec2, angle: number): number {
  const progress = Math.max(0, Math.min(1, age / duration));
  const lateral = direction.x * Math.cos(angle) - direction.z * Math.sin(angle);
  return (lateral < 0 ? -1 : 1) * progress * Math.PI * 2;
}

export function followCameraPose(position: Vec2, angle: number, aspect: number) {
  const fit = Math.min(1.45, Math.max(1, .95 / aspect));
  const x = Math.sin(angle), z = Math.cos(angle);
  return {
    position: { x: position.x + x * CAMERA.followDistance * fit, y: CAMERA.actorHeight + CAMERA.followHeight, z: position.z + z * CAMERA.followDistance * fit },
    target: { x: 0, y: CAMERA.actorHeight, z: 0 },
  };
}
