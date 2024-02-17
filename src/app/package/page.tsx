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
              <li key={index} className="ml-[2em]">
                {renderValue(item)}
              </li>
            ))}
            &#125;
          </ul>
        );
      } else {
        return (
          <ul>
            &#123;
            {Object.keys(value).map((key: string, index: number) => (
              <li key={index} className="ml-[2em]">
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
    <div className="truncate">
      <pre className="truncate">
        <code>{renderValue(data)}</code>
      </pre>
    </div>
  );
};

export default PackagePage;
