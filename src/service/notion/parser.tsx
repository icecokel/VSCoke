import CircleIcon from "@mui/icons-material/Circle";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ListBlockChildrenResponse } from "@notionhq/client/build/src/api-endpoints";
import Image from "next/image";

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
    // TODO
    if (block.type === "table") {
      return {
        type: block.type,
        contents: "table",
      };
    }

    if (block.type === "divider") {
      return {
        type: "divider",
        contents: "",
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

const getText = (contents: TText[] | string, Tag: React.ElementType, option?: any) => {
  return Array.isArray(contents) ? (
    contents.map(item => {
      return (
        <Tag {...option} fontWeight={item.isBold ? 700 : 400}>
          {item.text}
        </Tag>
      );
    })
  ) : (
    <Tag {...option}>{contents}</Tag>
  );
};

export const convertToElement = ({ type, contents }: ITag) => {
  switch (type) {
    case "heading_2": {
      return (
        <Stack direction={"row"}>
          {getText(contents, Typography, {
            variant: "h3",
            sx: { margin: "1em 0px" },
          })}
        </Stack>
      );
    }
    case "heading_3": {
      return (
        <Stack direction={"row"}>
          {getText(contents, Typography, { variant: "h4", sx: { margin: "1em 0px" } })}
        </Stack>
      );
    }
    case "paragraph": {
      return (
        <Stack direction={"row"}>
          {getText(contents, Typography, { variant: "body2", sx: { margin: "1em 0px" } })}
        </Stack>
      );
    }
    case "image": {
      return (
        <Container maxWidth="md">
          <Image height={900} width={900} src={contents.toString()} alt="img" />
        </Container>
      );
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
        <Stack
          className="border-l-2 border-l-blue-300"
          sx={{ backgroundColor: "#4C4C4C", padding: "0.5em 1em" }}
        >
          {getText(contents, Typography, { variant: "body2" })}
        </Stack>
      );
    }
    case "code": {
      const text = Array.isArray(contents) ? contents.map(({ text }) => text).join("") : contents;
      return (
        <Container
          maxWidth="md"
          sx={{
            backgroundColor: "#2A2A2A",
            padding: "1.5em",
            margin: "0.5em 0px",
            borderRadius: "4px",
          }}
        >
          <pre className="text-sm">{text}</pre>
        </Container>
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
