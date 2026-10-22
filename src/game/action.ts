import { ACTION } from '../data/action.ts';
import { damage } from './combat.ts';
import type { Outcome, Side, Stats } from './types.ts';

export type Vec2 = { x: number; z: number };
export type Mode = 'idle' | 'windup' | 'attack' | 'recovery' | 'dodge' | 'stunned';
export type ActionInput = { x: number; z: number; attack: boolean; dodge: boolean };
export type Actor = {
  position: Vec2; facing: Vec2; hp: number; stats: Stats; mode: Mode; age: number;
  attackCooldown: number; dodgeCooldown: number; hitConsumed: boolean;
};
export type ActionResult = { outcome: Outcome; remaining: { player: number; enemy: number }; elapsed: number; hits: number; reason: 'knockout' | 'timeout' };
export type ActionState = { time: number; actors: Record<Side, Actor>; hits: number; result?: ActionResult };
export type ActionEvent = { kind: 'hit'; side: Side; damage: number } | { kind: 'attack' | 'dodge'; side: Side };
const other = (side: Side): Side => side === 'player' ? 'enemy' : 'player';
const unit = (x: number, z: number): Vec2 => { const length = Math.hypot(x, z); return length ? { x: x / length, z: z / length } : { x: 0, z: -1 }; };

export function createAction(player: Stats, enemy: Stats): ActionState {
  for (const stats of [player, enemy]) if (Object.values(stats).some(value => !Number.isSafeInteger(value) || value < 1)) throw new Error('能力は1以上の整数が必要です。');
  const actor = (stats: Stats, z: number): Actor => ({ stats, hp: stats.hp, position: { x: 0, z }, facing: { x: 0, z: z > 0 ? -1 : 1 }, mode: 'idle', age: 0, attackCooldown: 0, dodgeCooldown: 0, hitConsumed: false });
  return { time: 0, actors: { player: actor(player, 4), enemy: actor(enemy, -4) }, hits: 0 };
}
function boundary(actor: Actor): void {
  const length = Math.hypot(actor.position.x, actor.position.z), max = ACTION.radius - ACTION.bodyRadius;
  if (length > max) { actor.position.x *= max / length; actor.position.z *= max / length; }
}
function move(actor: Actor, direction: Vec2, speed: number, dt: number): void {
  actor.position.x += direction.x * speed * dt; actor.position.z += direction.z * speed * dt; boundary(actor);
}
export function invulnerable(actor: Actor): boolean {
  return actor.mode === 'dodge' && actor.age >= ACTION.dodge.invulnerableFrom && actor.age <= ACTION.dodge.invulnerableTo;
}
function enemyInput(state: ActionState): ActionInput {
  const enemy = state.actors.enemy, player = state.actors.player;
  const dx = player.position.x - enemy.position.x, dz = player.position.z - enemy.position.z;
  const distance = Math.hypot(dx, dz), direction = unit(dx, dz);
  const dodge = player.mode === 'windup' && distance < 3.8 && Math.sin(state.time * 1.7) > .55;
  if (dodge) return { x: -direction.z, z: direction.x, attack: false, dodge: true };
  const forward = distance > 2.7 ? 1 : distance < 1.6 ? -.5 : 0;
  const orbit = Math.sin(state.time * .9) * .45;
  return { x: direction.x * forward - direction.z * orbit, z: direction.z * forward + direction.x * orbit, attack: distance < 3.25, dodge: false };
}
export function stepAction(state: ActionState, input: ActionInput, dt: number, ai = true): ActionEvent[] {
  if (!Number.isFinite(dt) || dt <= 0 || dt > .1) throw new Error('更新時間は0より大きく0.1秒以下が必要です。');
  if (state.result) return [];
  state.time += dt;
  const events: ActionEvent[] = [];
  const inputs = { player: input, enemy: ai ? enemyInput(state) : { x: 0, z: 0, attack: false, dodge: false } };
  for (const side of ['player', 'enemy'] as const) {
    const actor = state.actors[side], target = state.actors[other(side)], control = inputs[side];
    actor.attackCooldown = Math.max(0, actor.attackCooldown - dt); actor.dodgeCooldown = Math.max(0, actor.dodgeCooldown - dt);
    actor.age += dt;
    if (actor.mode === 'windup' && actor.age >= ACTION.attack.windup) { actor.mode = 'attack'; actor.age = 0; }
    else if (actor.mode === 'attack' && actor.age >= ACTION.attack.active) { actor.mode = 'recovery'; actor.age = 0; }
    else if (actor.mode === 'dodge' && actor.age >= ACTION.dodge.duration) { actor.mode = 'recovery'; actor.age = ACTION.attack.recovery - ACTION.dodge.recovery; }
    else if ((actor.mode === 'recovery' && actor.age >= ACTION.attack.recovery) || (actor.mode === 'stunned' && actor.age >= ACTION.hitStun)) { actor.mode = 'idle'; actor.age = 0; }
    if (actor.mode === 'idle') {
      const toward = unit(target.position.x - actor.position.x, target.position.z - actor.position.z);
      const moving = Math.hypot(control.x, control.z) > .08;
      actor.facing = toward;
      if (control.dodge && actor.dodgeCooldown === 0) {
        actor.mode = 'dodge'; actor.age = 0; actor.dodgeCooldown = ACTION.dodge.cooldown;
        actor.facing = moving ? unit(control.x, control.z) : { x: -toward.x, z: -toward.z };
        events.push({ kind: 'dodge', side });
      } else if (control.attack && actor.attackCooldown === 0) {
        actor.mode = 'windup'; actor.age = 0; actor.attackCooldown = ACTION.attack.cooldown; actor.hitConsumed = false;
        events.push({ kind: 'attack', side });
      } else if (moving) move(actor, unit(control.x, control.z), ACTION.moveSpeed * Math.min(1, Math.hypot(control.x, control.z)), dt);
    }
    if (actor.mode === 'attack') move(actor, actor.facing, ACTION.attack.speed, dt);
    if (actor.mode === 'dodge') move(actor, actor.facing, ACTION.dodge.speed, dt);
  }
  // 両方の命中を先に判定し、同時ノックアウトも公平に扱う。
  const hits: { attacker: Side; defender: Side; amount: number }[] = [];
  for (const side of ['player', 'enemy'] as const) {
    const actor = state.actors[side], target = state.actors[other(side)];
    if (actor.mode !== 'attack' || actor.hitConsumed || invulnerable(target)) continue;
    const dx = target.position.x - actor.position.x, dz = target.position.z - actor.position.z, distance = Math.hypot(dx, dz);
    const facing = distance < .01 ? 1 : (dx * actor.facing.x + dz * actor.facing.z) / distance;
    if (distance <= ACTION.attack.reach && facing >= ACTION.attack.facingDot) {
      actor.hitConsumed = true; hits.push({ attacker: side, defender: other(side), amount: damage(actor.stats.atk, target.stats.def) });
    }
  }
  for (const hit of hits) {
    const target = state.actors[hit.defender];
    target.hp = Math.max(0, target.hp - hit.amount); target.mode = 'stunned'; target.age = 0;
    const direction = state.actors[hit.attacker].facing;
    move(target, direction, .6, 1);
    state.hits++; events.push({ kind: 'hit', side: hit.defender, damage: hit.amount });
  }
  const player = state.actors.player, enemy = state.actors.enemy;
  const dx = player.position.x - enemy.position.x, dz = player.position.z - enemy.position.z, distance = Math.hypot(dx, dz);
  if (distance < ACTION.bodyRadius * 2) {
    const direction = distance > .001 ? unit(dx, dz) : { x: 1, z: 0 };
    const push = (ACTION.bodyRadius * 2 - distance) / 2;
    move(player, direction, push, 1); move(enemy, { x: -direction.x, z: -direction.z }, push, 1);
  }
  if (player.hp <= 0 || enemy.hp <= 0 || state.time >= ACTION.timeLimit) {
    const knockout = player.hp <= 0 || enemy.hp <= 0;
    const difference = knockout ? player.hp <= 0 ? enemy.hp <= 0 ? 0 : -1 : 1 : player.hp / player.stats.hp - enemy.hp / enemy.stats.hp;
    state.result = { outcome: Math.abs(difference) < 1e-9 ? 'draw' : difference > 0 ? 'win' : 'lose', remaining: { player: player.hp, enemy: enemy.hp }, elapsed: Math.min(ACTION.timeLimit, state.time), hits: state.hits, reason: knockout ? 'knockout' : 'timeout' };
  }
  return events;
}
