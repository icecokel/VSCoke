import BaseText from "@ui/Text";
import { NextPage } from "next";
import data from "package.json";

const PackagePage: NextPage = () => {
  const renderValue = (value: any) => {
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        return (
          <ul>
            &#123;
            {value.map((item: any, index: number) => (
              <li key={index} className="ml-[1em]">
                <BaseText>{renderValue(item)}</BaseText>
              </li>
            ))}
            &#125;
          </ul>
        );
      } else {
        return (
          <ul className="ml-[1em]">
            &#123;
            {Object.keys(value).map((key: string, index: number) => (
              <li key={index} className="ml-[1em]">
                <BaseText className="font-bold mr-1">"{key}"</BaseText>:
                <BaseText className="ml-1">{renderValue(value[key])}</BaseText>
              </li>
            ))}
            &#125;
          </ul>
        );
      }
    } else {
      return typeof value === "string" ? `"${value}"` : value;
    }
  };

  return (
    <div className="p-5 bg-gray-700 rounded">
      <pre className="-ml-[1em]">
        <code>{renderValue(data)}</code>
      </pre>
    </div>
  );
};

export default PackagePage;
