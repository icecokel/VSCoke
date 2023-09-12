"use client";

import Box from "@mui/material/Box";
import Fade from "@mui/material/Fade";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useState } from "react";

export interface ICard {
  thumnail: string;
  date: string;
  title: string;
  review?: string;
  items?: { imageSrc: string; review?: string }[];
}

const HobbyCard = ({ date, thumnail, title, items, review }: ICard) => {
  const [isHideInfo, setIsHideInfo] = useState(true);

  const handleMouseEnter = () => {
    setIsHideInfo(false);
  };
  const handleMouseLeave = () => {
    setIsHideInfo(true);
  };

  return (
    <Grid item xs={6} sm={4} md={3}>
      <div
        className="relative overflow-hidden rounded aspect-square p-[8px]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Stack
          alignItems={"center"}
          justifyContent={"center"}
          className="aspect-square bg-yellow-200/10 rounded"
        >
          <Image
            src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${thumnail}`}
            width={300}
            height={300}
            alt=""
            className="object-cover"
          />
        </Stack>

        <Fade in={!isHideInfo}>
          <Stack
            justifyContent={"center"}
            alignItems={"center"}
            className="w-full h-full translate-y-[-100%] rounded bg-black/60"
          >
            <Box>
              <Typography color={"white"} variant="h6">
                {title}
              </Typography>
              <Typography color={"white"} variant="body1">
                {date}
              </Typography>
              <Typography color={"white"} variant="body2">
                {review}
              </Typography>
            </Box>
          </Stack>
        </Fade>
      </div>
    </Grid>
  );
};

export default HobbyCard;
