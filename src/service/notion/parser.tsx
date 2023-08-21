import CircleIcon from "@mui/icons-material/Circle";
import { Stack } from "@mui/material";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ListBlockChildrenResponse } from "@notionhq/client/build/src/api-endpoints";

type TText = { isBold?: boolean; text: string };

export interface ITag {
  type: string;
  contents: TText[] | string;
}

export const parseToHtml = (target: ListBlockChildrenResponse): ITag[] => {
  return target.results.map((block: any) => {
    if (block.type === "image") {
      return {
        type: block.type,
        contents: block.image.file.url,
      };
    }

    if (block[block.type].rich_text.length === 0) {
      return {
        type: "space",
        contents: "",
      };
    }
    return {
      type: block.type,
      contents: block[block.type].rich_text.map((item: any) => {
        return { isBold: item.annotations.bold, text: item.plain_text };
      }),
    };
  });
};

export const convertToElement = ({ type, contents }: ITag) => {
  switch (type) {
    case "heading_2": {
      return (
        <Typography variant="h3" sx={{ margin: "1em 0px" }} className="flex">
          {Array.isArray(contents)
            ? contents.map(item => {
                return (
                  <Typography variant="h3" fontWeight={item.isBold ? 700 : 400}>
                    {item.text}
                  </Typography>
                );
              })
            : contents}
        </Typography>
      );
    }
    case "heading_3": {
      return (
        <Typography variant="h4" sx={{ margin: "1em 0px" }} className="flex">
          {Array.isArray(contents)
            ? contents.map(item => {
                return (
                  <Typography variant="h4" fontWeight={item.isBold ? 700 : 400}>
                    {item.text}
                  </Typography>
                );
              })
            : contents}
        </Typography>
      );
    }
    case "paragraph": {
      return (
        <Typography variant="body2" sx={{ margin: "1em 0px" }} className="flex">
          {Array.isArray(contents)
            ? contents.map(item => {
                return (
                  <Typography variant="body2" fontWeight={item.isBold ? 700 : 400}>
                    {item.text}
                  </Typography>
                );
              })
            : contents}
        </Typography>
      );
    }
    case "image": {
      // return <Image fill priority sizes="500px" src={text} alt="" />;
      return "이미지";
    }

    case "bulleted_list_item": {
      return (
        <Box>
          {Array.isArray(contents)
            ? contents.map(item => {
                return (
                  <Stack direction={"row"} gap={1.5} alignItems={"center"}>
                    <CircleIcon sx={{ fontSize: "6px" }} />
                    <Typography variant="body2" fontWeight={item.isBold ? 700 : 400}>
                      {item.text}
                    </Typography>
                  </Stack>
                );
              })
            : contents}
        </Box>
      );
    }

    case "quote": {
      return (
        <Box
          className="border-l-2 border-l-blue-100"
          sx={{ backgroundColor: "#4C4C4C", padding: "0.5em 1em" }}
        >
          {Array.isArray(contents)
            ? contents.map(item => {
                return (
                  <Typography variant="body2" fontWeight={item.isBold ? 700 : 400}>
                    {item.text}
                  </Typography>
                );
              })
            : contents}
        </Box>
      );
    }
    case "code": {
      const text = Array.isArray(contents) ? contents.map(({ text }) => text).join("") : contents;
      return (
        <Box sx={{ backgroundColor: "#2A2A2A", padding: "1.5em", margin: "0.5em 0px" }}>
          <pre>{text}</pre>
        </Box>
      );
    }
    case "space": {
      return <br />;
    }
    default: {
      return `${type}${
        Array.isArray(contents) ? contents.map(({ text }) => text).join("") : contents
      }`;
    }
  }
};
