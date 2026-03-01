import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Link,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../auth/AuthContext";

const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  keepSignedIn: z.boolean()
});

type SignInValues = z.infer<typeof signInSchema>;

export function SignInPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | undefined)?.from ?? "/app/dashboard";
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
      keepSignedIn: true
    }
  });

  const onSubmit = async (values: SignInValues) => {
    signIn(values.email);
    navigate(from, { replace: true });
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <Card sx={{ width: "100%", maxWidth: 520, border: "1px solid #E7D7CC", boxShadow: 2 }}>
        <CardContent>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h4" component="h1" fontWeight={700}>
                Sign in
              </Typography>
              <Typography color="text.secondary">Access your events and split history.</Typography>
            </Box>

            <Alert severity="warning">Email not verified. Verify your email before joining events.</Alert>

            <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={2}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="email"
                      label="Email"
                      placeholder="name@example.com"
                      error={Boolean(errors.email)}
                      helperText={errors.email?.message ?? "Use the email tied to your account."}
                    />
                  )}
                />
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="password"
                      label="Password"
                      placeholder="Enter your password"
                      error={Boolean(errors.password)}
                      helperText={errors.password?.message ?? "Password is required to continue."}
                    />
                  )}
                />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Controller
                    name="keepSignedIn"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Checkbox checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                        label="Keep me signed in"
                      />
                    )}
                  />
                  <Link href="#" underline="hover">
                    Forgot password?
                  </Link>
                </Stack>

                <Button type="submit" variant="contained" sx={{ minHeight: 44 }} disabled={isSubmitting}>
                  Sign in
                </Button>
              </Stack>
            </Box>

            <Typography textAlign="center" color="text.secondary">
              New to Split-Bill?{" "}
              <Link component={RouterLink} to="/register" underline="hover">
                Create an account
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
