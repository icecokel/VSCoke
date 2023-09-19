"use client";

import Box from "@mui/material/Box";
import Dialog, { DialogProps } from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
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
  items: string[];
}

const HobbyCard = ({ date, thumnail, title, items, review }: ICard) => {
  const [isHideInfo, setIsHideInfo] = useState(true);
  const [open, setOpen] = useState(false);

  const handleMouseEnter = () => {
    setIsHideInfo(false);
  };
  const handleMouseLeave = () => {
    setIsHideInfo(true);
  };
  const onToggleModal = () => {
    setOpen(!open);
  };

  return (
    <Grid item xs={6} sm={4} md={3}>
      <div
        className="relative overflow-hidden rounded aspect-square p-[8px]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onToggleModal}
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
              <Typography color={"white"} variant="h6" fontWeight={600}>
                {title}
              </Typography>
              <Typography variant="body1" className="text-white/80">
                {date}
              </Typography>
              <Typography variant="body1" className="text-white/80">
                {review}
              </Typography>
            </Box>
          </Stack>
        </Fade>
      </div>
      <HobbyCard.detail open={open} items={items} onClose={onToggleModal} title={title} />
    </Grid>
  );
};

export default HobbyCard;

interface HobbyCardDetailProps extends DialogProps {
  title: string;
  items?: string[];
}

HobbyCard.detail = ({ items, title, ...restProps }: HobbyCardDetailProps) => {
  return (
    <Dialog {...restProps}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {items?.map(src => {
          return (
            <Image
              src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${src}`}
              width={300}
              height={300}
              alt=""
              className="object-cover"
            />
          );
        })}
      </DialogContent>
    </Dialog>
  );
};
