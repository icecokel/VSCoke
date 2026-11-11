import { NextPage } from "next";
import data from "../../../../package.json";

const PackagePage: NextPage = () => {
  return (
    <div className="p-5 bg-gray-700 rounded-sm">
      <pre className="overflow-x-auto whitespace-pre">
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>
    </div>
  );
};

export default PackagePage;
