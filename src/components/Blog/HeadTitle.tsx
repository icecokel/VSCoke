import { convertByFormat } from "@/utils/DateUtil";

interface IHeadTitle {
  title: string;
  date: string;
}

const HeadTitle = ({ title, date }: IHeadTitle) => {
  return (
    <div className="flex items-end gap-2 my-[1em]">
      <h1 className="text-[32px] font-bold ml-[0.5em]">{title}</h1>
      <time dateTime={date} className="text-sm text-gray-700">
        ({convertByFormat({ date })})
      </time>
    </div>
  );
};

export default HeadTitle;
