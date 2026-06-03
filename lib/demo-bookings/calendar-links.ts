type CalendarInput = {
  name: string;
  date: string;
  time: string;
  company: string;
};

function toUtcDateString(date: string, time: string): string {
  const iso = new Date(`${date}T${time}:00Z`).toISOString();
  return iso.replaceAll("-", "").replaceAll(":", "").split(".")[0] + "Z";
}

export function buildGoogleCalendarLink(input: CalendarInput): string {
  const start = toUtcDateString(input.date, input.time);
  const endDate = new Date(`${input.date}T${input.time}:00Z`);
  endDate.setMinutes(endDate.getMinutes() + 30);
  const end = endDate.toISOString().replaceAll("-", "").replaceAll(":", "").split(".")[0] + "Z";

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", `Clarivo demo with ${input.company}`);
  url.searchParams.set("details", `Clarivo demo booked for ${input.name}.`);
  url.searchParams.set("dates", `${start}/${end}`);
  return url.toString();
}

export function buildOutlookCalendarLink(input: CalendarInput): string {
  const startIso = new Date(`${input.date}T${input.time}:00Z`).toISOString();
  const endDate = new Date(startIso);
  endDate.setMinutes(endDate.getMinutes() + 30);

  const url = new URL("https://outlook.live.com/calendar/0/deeplink/compose");
  url.searchParams.set("path", "/calendar/action/compose");
  url.searchParams.set("subject", `Clarivo demo with ${input.company}`);
  url.searchParams.set("body", `Clarivo demo booked for ${input.name}.`);
  url.searchParams.set("startdt", startIso);
  url.searchParams.set("enddt", endDate.toISOString());
  return url.toString();
}
