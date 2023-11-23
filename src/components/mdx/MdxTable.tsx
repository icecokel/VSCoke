export interface IMdxTableProps {
  tableData: string;
}

const convertToArray = (item: string) => {
  return item
    .split("|")
    .map(item => item.trim())
    .filter(item => item);
};

const convertToTableArray = (tableData: string) => {
  const array = tableData.split("\n").filter(item => item);

  return {
    head: convertToArray(array[0]),
    body: array.slice(2).map(items => convertToArray(items)),
  };
};

const MdxTable = ({ tableData }: IMdxTableProps) => {
  const { head, body } = convertToTableArray(tableData);

  return (
    <table>
      <thead>
        <tr className="">
          {head.map((item, index) => {
            return (
              <th key={`head_${index}`} className="p-2 border-[1px] border-gray-100 bg-beige-400">
                {item}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {body.map((items, rowIndex) => {
          return (
            <tr key={`row_${rowIndex}`}>
              {items.map((item, index) => {
                return (
                  <td
                    key={`item_${rowIndex}_${index}`}
                    className="p-2 border-[1px] border-gray-100"
                  >
                    {item}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default MdxTable;
