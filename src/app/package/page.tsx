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
              <li key={index} className="ml-[1em] ">
                {renderValue(item)}
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
                <strong>"{key}":</strong> {renderValue(value[key])}
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
