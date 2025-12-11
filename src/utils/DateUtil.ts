interface Props {
  date: Date | string;
  format?: string;
}

export const convertByFormat = ({ date, format = "YYYY/MM/DD" }: Props) => {
  const targetDate = typeof date === "string" ? new Date(date) : date;

  const years = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const day = targetDate.getDay();
  const hours = targetDate.getHours();
  const minutes = targetDate.getMinutes();
  const seconds = targetDate.getSeconds();

  return format
    .replaceAll("YYYY", `${years}`)
    .replaceAll("YY", `${years.toString().slice(2)}`)
    .replaceAll("MM", `${month.toString().padStart(2, "0")}`)
    .replaceAll("DD", `${day.toString().padStart(2, "0")}`)
    .replaceAll("hh", `${hours.toString().padStart(2, "0")}`)
    .replaceAll("mm", `${minutes.toString().padStart(2, "0")}`)
    .replaceAll("ss", `${seconds.toString().padStart(2, "0")}`);
};
