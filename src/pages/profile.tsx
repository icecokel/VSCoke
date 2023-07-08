import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

/**
 * 이력서 페이지
 * @returns 이력서 컴포넌트
 */
const Profile = () => {
  return (
    <Box className="p-5 bg-gray-900 h-screen">
      <Box className="flex gap-5">
        <Avatar
          className="w-[200px] h-[200px] border-4 border-yellow-200"
          src="https://icecokel-blog-dev.s3.ap-northeast-2.amazonaws.com/images/profileImg.jpg"
        />
        <Box className="flex flex-col mt-10 gap-10">
          <Typography variant="h5" fontWeight={600} color={"#ffffff"}>
            코딩만 하지 않는 개발자 이상민입니다.
          </Typography>
          <Alert severity="info" icon={false}>
            <Typography variant="body1">이상민</Typography>
            <Typography variant="body1">
              <a href="mailto:red9runge@gmail.com">red9runge@gmail.com</a>
            </Typography>
            <Typography variant="body1">
              <a href="tel:01020809652">01020809652</a>
            </Typography>
          </Alert>
        </Box>
      </Box>
    </Box>
  );
};

export default Profile;
