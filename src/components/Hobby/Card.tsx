"use client";

import ArrowBackIosTwoToneIcon from "@mui/icons-material/ArrowBackIosTwoTone";
import ArrowForwardIosTwoToneIcon from "@mui/icons-material/ArrowForwardIosTwoTone";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Fade from "@mui/material/Fade";
import Grid from "@mui/material/Grid";
import Modal from "@mui/material/Modal";
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

  return (
    <Grid item xs={6} sm={4} md={3}>
      <div
        className="relative overflow-hidden rounded aspect-square p-[8px]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => setOpen(true)}
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
        <HobbyCard.detail open={open} onClose={() => setOpen(false)} items={items} title={title} />
      </div>
    </Grid>
  );
};

export default HobbyCard;

interface IDetailProps {
  title: string;
  open: boolean;
  onClose: () => void;
  items: string[];
}

HobbyCard.detail = ({ open, onClose, items, title }: IDetailProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const setIndex = (type: "inc" | "decr") => () => {
    setCurrentIndex(prev => (type === "inc" ? prev + 1 : prev - 1));
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      componentsProps={{ backdrop: { sx: { backgroundColor: "rgba(0, 0, 0, 0.8)" } } }}
    >
      <Stack justifyContent={"center"} alignItems={"center"} className="h-screen">
        <Typography color={"white"} variant="h5">
          {title}
        </Typography>
        <Container maxWidth="md" className="mt-5 flex flex-row">
          {items?.map((src, index) => {
            return (
              <Box
                className={"my-auto items-center gap-3"}
                key={`${src}_${index}`}
                display={currentIndex === index ? "flex" : "none"}
              >
                <Button variant="text" onClick={setIndex("decr")} disabled={currentIndex === 0}>
                  <ArrowBackIosTwoToneIcon
                    sx={{
                      fontSize: "38px",
                      color: currentIndex === 0 ? "rgba(#FFFFFF, 0.7)" : "#FFFFFF",
                    }}
                  />
                </Button>
                <Fade in={currentIndex === index}>
                  <Image
                    src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${src}`}
                    width={900}
                    height={900}
                    alt=""
                    className="object-contain rounded "
                  />
                </Fade>
                <Button
                  variant="text"
                  onClick={setIndex("inc")}
                  disabled={currentIndex === items.length - 1}
                >
                  <ArrowForwardIosTwoToneIcon
                    sx={{
                      fontSize: "38px",
                      color: currentIndex === items.length - 1 ? "rgba(#FFFFFF, 0.7)" : "#FFFFFF",
                    }}
                  />
                </Button>
              </Box>
            );
          })}
        </Container>
      </Stack>
    </Modal>
  );
};
