"use client";

import BaseText from "../baseUi/Text";
import DeviceThermostatOutlinedIcon from "@mui/icons-material/DeviceThermostatOutlined";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Fade from "@mui/material/Fade";
import Grid from "@mui/material/Grid";
import Modal from "@mui/material/Modal";
import Image from "next/image";
import { useState } from "react";
import { Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

export interface ICard {
  thumbnail: string;
  date: string;
  title: string;
  review?: string;
  items: string[];
}

const HobbyCard = ({ date, thumbnail: thumbnail, title, items, review }: ICard) => {
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
        <div className="flex items-center justify-center aspect-square bg-yellow-200/10 rounded">
          <Image
            src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${thumbnail}`}
            width={300}
            height={300}
            alt=""
            className="object-cover"
          />
        </div>

        <Fade in={!isHideInfo}>
          <div className="w-full h-full translate-y-[-100%] rounded bg-black/60 flex justify-center items-center">
            <Box>
              <BaseText type="h6" className="text-white">
                {title}
              </BaseText>
              <BaseText type="body1" className="text-white/80">
                {date}
              </BaseText>
              <BaseText type="body1" className="text-white/80">
                {review}
              </BaseText>
            </Box>
          </div>
        </Fade>
        <HobbyCard.detail
          open={open}
          onClose={() => setOpen(false)}
          items={items}
          title={title}
          temporary={17.7}
          weather="sun"
        />
      </div>
    </Grid>
  );
};

export default HobbyCard;

interface IDetailProps {
  title: string;
  temporary?: number;
  weather?: string;
  open: boolean;
  onClose: () => void;
  items: string[];
}

HobbyCard.detail = ({ open, onClose, items, title, temporary, weather }: IDetailProps) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      componentsProps={{ backdrop: { sx: { backgroundColor: "rgba(0, 0, 0, 0.8)" } } }}
    >
      <div className="h-screen flex justify-center items-center">
        <Container maxWidth="md" className="flex justify-between">
          <BaseText type="h5" className="text-white">
            {title}
          </BaseText>
          <div className="flex flex-col items-end">
            {temporary && (
              <BaseText type="body2" className="text-white">
                <DeviceThermostatOutlinedIcon />
                {temporary}
              </BaseText>
            )}
            {weather && (
              <BaseText type="body2" className="text-white">
                {weather}
              </BaseText>
            )}
          </div>
        </Container>
        <Container maxWidth="md" className="mt-5 flex flex-row">
          <Swiper navigation={true} modules={[Navigation]} className="mySwiper">
            {items.map(src => (
              <SwiperSlide>
                <Image
                  src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${src}`}
                  width={900}
                  height={900}
                  alt=""
                  className="object-contain rounded "
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </Container>
      </div>
    </Modal>
  );
};
