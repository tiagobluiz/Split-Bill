import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Link,
  Stack,
  Typography
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const features = [
  {
    title: "Track event expenses",
    body: "Add multiple entries over time and keep every shared moment organized."
  },
  {
    title: "See fair balances",
    body: "Understand who sends and who gets back with transparent totals."
  },
  {
    title: "Invite collaborators",
    body: "Share one event workspace so everyone stays aligned."
  }
];

export function LandingPage() {
  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 3, md: 8 } }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #E7D7CC",
              pb: 2
            }}
          >
            <Typography variant="h5" fontWeight={700}>
              Split-Bill
            </Typography>
            <Stack direction="row" spacing={3}>
              <Link href="#" underline="hover" color="text.secondary">
                Features
              </Link>
              <Link href="#" underline="hover" color="text.secondary">
                How it works
              </Link>
              <Link href="#" underline="hover" color="text.secondary">
                Security
              </Link>
              <Link component={RouterLink} to="/sign-in" underline="hover" color="text.primary">
                Sign in
              </Link>
            </Stack>
          </Box>

          <Box textAlign="center">
            <Typography variant="h3" component="h1" fontWeight={700} sx={{ mb: 1.5 }}>
              Split-Bill keeps your shared expenses organized.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Sign in to access your events, entries, balances, and history in one friendly workspace.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
              <Button component={RouterLink} to="/sign-in" variant="contained" sx={{ minHeight: 44 }}>
                Sign in
              </Button>
              <Button component={RouterLink} to="/register" variant="outlined" sx={{ minHeight: 44 }}>
                Create account
              </Button>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              New here?{" "}
              <Link component={RouterLink} to="/register" underline="hover">
                Create account
              </Link>{" "}
              | Sign in to see your events and history.
            </Typography>
            <Typography
              variant="body2"
              sx={{
                display: "inline-block",
                mt: 2,
                px: 2,
                py: 1,
                borderRadius: "999px",
                bgcolor: "#FFF1E7"
              }}
            >
              Welcome back. Your events are waiting for you.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            {features.map((feature) => (
              <Card key={feature.title} sx={{ flex: 1, border: "1px solid #F3E4DA", boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary">{feature.body}</Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Typography textAlign="center" fontStyle="italic" color="text.secondary">
            Used for trips, shared homes, and group dinners across Europe.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
