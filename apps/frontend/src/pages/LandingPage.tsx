import {
  AppBar,
  CardActionArea,
  CardActions,
  CardMedia,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Link,
  Stack,
  Toolbar,
  Typography
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import appLogo from "../assets/branding/split-bill-logo.png";
import balancesIllustration from "../assets/landing/feature-balances.svg";
import expensesIllustration from "../assets/landing/feature-expenses.svg";
import inviteIllustration from "../assets/landing/feature-invite.svg";

const features = [
  {
    title: "Track event expenses",
    body: "Add multiple entries over time and keep every shared moment organized.",
    image: expensesIllustration
  },
  {
    title: "See fair balances",
    body: "Understand who sends and who gets back with transparent totals.",
    image: balancesIllustration
  },
  {
    title: "Invite collaborators",
    body: "Share one event workspace so everyone stays aligned.",
    image: inviteIllustration
  }
];

export function LandingPage() {
  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 3, md: 8 }, bgcolor: "background.default" }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <AppBar
            position="static"
            color="transparent"
            elevation={0}
            sx={{ borderBottom: "1px solid #E7D7CC", bgcolor: "transparent" }}
          >
            <Toolbar sx={{ px: { xs: 0, md: 1 }, minHeight: "64px !important" }}>
              <Box
                component={RouterLink}
                to="/"
                sx={{ flexGrow: 1, display: "inline-flex", alignItems: "center", textDecoration: "none" }}
                aria-label="Split-Bill home"
              >
                <Box component="img" src={appLogo} alt="Split-Bill logo" sx={{ height: 44, width: "auto" }} />
              </Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: "none", md: "flex" } }}>
                <Button href="#features" color="inherit" sx={{ color: "text.secondary", minHeight: 40 }}>
                  Features
                </Button>
                <Button href="#how-it-works" color="inherit" sx={{ color: "text.secondary", minHeight: 40 }}>
                  How it works
                </Button>
                <Button href="#security" color="inherit" sx={{ color: "text.secondary", minHeight: 40 }}>
                  Security
                </Button>
                <Button
                  component={RouterLink}
                  to="/sign-in"
                  variant="outlined"
                  sx={{ minHeight: 40, borderColor: "#E7D7CC", color: "text.primary" }}
                >
                  Sign in
                </Button>
              </Stack>
            </Toolbar>
          </AppBar>

          <Box id="how-it-works" textAlign="center" sx={{ pt: { xs: 2, md: 3 } }}>
            <Typography variant="h3" component="h1" fontWeight={700} sx={{ mb: 1.5 }}>
              Split-Bill keeps your shared expenses organized.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Sign in to access your events, entries, balances, and history in one friendly workspace.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
              <Button component={RouterLink} to="/sign-in" variant="contained" sx={{ minHeight: 44, px: 3 }}>
                Sign in
              </Button>
              <Button
                component={RouterLink}
                to="/register"
                variant="outlined"
                sx={{ minHeight: 44, px: 3, borderColor: "#E7D7CC", bgcolor: "#FFF1E7", color: "#1F2937" }}
              >
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
          </Box>

          <Stack id="features" direction={{ xs: "column", md: "row" }} spacing={2}>
            {features.map((feature) => (
              <Card key={feature.title} sx={{ flex: 1, border: "1px solid #F3E4DA", boxShadow: 2, borderRadius: 3 }}>
                <CardActionArea disableRipple>
                  <CardMedia component="img" image={feature.image} alt={`${feature.title} illustration`} sx={{ height: 170 }} />
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      {feature.title}
                    </Typography>
                    <Typography color="text.secondary">{feature.body}</Typography>
                  </CardContent>
                </CardActionArea>
                <CardActions sx={{ px: 2.5, pt: 0, pb: 2.5 }}>
                  <Button
                    size="small"
                    variant="text"
                    color="secondary"
                    component={RouterLink}
                    to="/sign-in"
                    sx={{ minHeight: 36 }}
                  >
                    Explore
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Stack>

          <Stack spacing={2}>
            <Typography id="security" textAlign="center" fontStyle="italic" color="text.secondary">
              Used for trips, shared homes, and group dinners across Europe.
            </Typography>
            <Divider />
            <Stack direction="row" justifyContent="center" spacing={3} flexWrap="wrap">
              <Link href="#privacy" underline="hover" color="text.secondary">
                Privacy
              </Link>
              <Link href="#terms" underline="hover" color="text.secondary">
                Terms
              </Link>
              <Link href="#contact" underline="hover" color="text.secondary">
                Contact
              </Link>
            </Stack>
          </Stack>
          <Box id="privacy" sx={{ display: "none" }} />
          <Box id="terms" sx={{ display: "none" }} />
          <Box id="contact" sx={{ display: "none" }} />
        </Stack>
      </Container>
    </Box>
  );
}
