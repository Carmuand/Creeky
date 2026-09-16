import tasksRaw from "@/assets/icons/tasks.svg?raw";
import calendarRaw from "@/assets/icons/calendar.svg?raw";
import clockRaw from "@/assets/icons/clock.svg?raw";
import eisenhowerRaw from "@/assets/icons/eisenhower.svg?raw";
import usersRaw from "@/assets/icons/users.svg?raw";
import searchRaw from "@/assets/icons/search.svg?raw";
import syncRaw from "@/assets/icons/sync.svg?raw";
import bellRaw from "@/assets/icons/bell.svg?raw";
import helpRaw from "@/assets/icons/help.svg?raw";
import pencilRaw from "@/assets/icons/pencil.svg?raw";
import tagRaw from "@/assets/icons/tag.svg?raw";
import timerRaw from "@/assets/icons/timer.svg?raw";
import trashRaw from "@/assets/icons/trash.svg?raw";
import flagRaw from "@/assets/icons/flag.svg?raw";
import restoreRaw from "@/assets/icons/restore.svg?raw";
import checkRaw from "@/assets/icons/check.svg?raw";
import zapRaw from "@/assets/icons/zap.svg?raw";
import infoRaw from "@/assets/icons/info.svg?raw";
import boardRaw from "@/assets/icons/board.svg?raw";
import listRaw from "@/assets/icons/list.svg?raw";
import boxRaw from "@/assets/icons/box.svg?raw";
import plusRaw from "@/assets/icons/plus.svg?raw";
import gearRaw from "@/assets/icons/gear.svg?raw";
import xcircRaw from "@/assets/icons/xcirc.svg?raw";
import inboxRaw from "@/assets/icons/inbox.svg?raw";
import lockRaw from "@/assets/icons/lock.svg?raw";
import hourglassRaw from "@/assets/icons/hourglass.svg?raw";

const map: Record<string, string> = {
  pencil: pencilRaw,
  bell: bellRaw,
  calendar: calendarRaw,
  clock: clockRaw,
  flag: flagRaw,
  timer: timerRaw,
  tag: tagRaw,
  inbox: inboxRaw,
  trash: trashRaw,
  zap: zapRaw,
  check: checkRaw,
  restore: restoreRaw,
  lock: lockRaw,
  info: infoRaw,
  sync: syncRaw,
  board: boardRaw,
  list: listRaw,
  box: boxRaw,
  plus: plusRaw,
  gear: gearRaw,
  xcirc: xcircRaw,
  search: searchRaw,
  users: usersRaw,
  hourglass: hourglassRaw,
  help: helpRaw,
  tasks: tasksRaw,
  eisenhower: eisenhowerRaw,
};

/**
 * Icon rendered from an external SVG file.
 */
export function Icon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  const raw = map[name];
  if (!raw) return null;
  const sized = raw.replace("<svg", `<svg width="${size}" height="${size}"`);
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: sized }}
    />
  );
}
