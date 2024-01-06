"use client";

import HobbyCard from "./Card";
import HikingRoundedIcon from "@mui/icons-material/HikingRounded";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Rating from "@mui/material/Rating";
import Typography from "@mui/material/Typography";

interface IHobbyProps {
  type: string;
}

const Hobby = ({ type }: IHobbyProps) => {
  return (
    <div className="gap-[10px] border-[4px]">
      <div className="flex gap-[20px] p-3 text-black bg-white rounded items-center">
        <HikingRoundedIcon className="text-green-300 hidden sm:block" sx={{ fontSize: "80px" }} />
        <div>
          <Typography variant="h3">{type}</Typography>
          <Typography variant="body1">주로 봄, 가을에 다니고 </Typography>
          <Rating name="read-only" value={4} readOnly />
        </div>
      </div>

      <Box color={"black"} bgcolor={"#fff"} borderRadius={"4px"} padding={"12px"}>
        <Grid container>
          {Array.from(Array(15)).map((item, index) => {
            return (
              <HobbyCard
                key={index}
                date="123"
                thumbnail="test.JPG"
                title="선자령"
                items={["test.JPG", "test.JPG", "test.JPG"]}
              />
            );
          })}
        </Grid>
      </Box>
    </div>
  );
};

export default Hobby;
