import Box from "@mui/material/Box";

const Search = () => {
  const data = {};
  return (
    <Box className="bg-gray-900  text-gray-100 h-screen min-w-[250px] p-2">
      <input type="text" placeholder="Search" className="w-100" />
    </Box>
  );
};

export default Search;
