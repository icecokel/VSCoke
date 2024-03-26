import { convertByFormat } from "@/utils/DateUtil";

interface IHeadTitle {
  title: string;
  date: string;
}

const HeadTitle = ({ title, date }: IHeadTitle) => {
  return (
    <div className="flex flex-col md:items-end gap-2 my-[1em] md:flex-row p-2">
      <h1 className="text-[32px] font-bold">{title}</h1>
      <time dateTime={date} className="text-sm text-gray-700">
        ({convertByFormat({ date })})
      </time>
    </div>
  );
};

export default HeadTitle;
