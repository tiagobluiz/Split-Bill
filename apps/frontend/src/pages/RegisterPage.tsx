import { Alert, Box, Button, Card, CardContent, Link, Stack, TextField, Typography } from "@mui/material";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { z } from "zod";

const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required"),
    email: z.email("Enter a valid email address"),
    password: z.string().min(8, "Password must have at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password")
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match"
  });

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = async () => {
    navigate("/sign-in", { replace: true });
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <Card sx={{ width: "100%", maxWidth: 560, border: "1px solid #E7D7CC", boxShadow: 2 }}>
        <CardContent>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h4" component="h1" fontWeight={700}>
                Create account
              </Typography>
              <Typography color="text.secondary">Register and verify your email before joining events.</Typography>
            </Box>
            <Alert severity="info">You must verify your email before creating or joining events.</Alert>
            <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={2}>
                <Controller
                  name="fullName"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Full name" error={Boolean(errors.fullName)} helperText={errors.fullName?.message ?? "How your name appears in event spaces."} />
                  )}
                />
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
                      helperText={errors.email?.message}
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
                      error={Boolean(errors.password)}
                      helperText={errors.password?.message}
                    />
                  )}
                />
                <Controller
                  name="confirmPassword"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="password"
                      label="Confirm password"
                      error={Boolean(errors.confirmPassword)}
                      helperText={errors.confirmPassword?.message}
                    />
                  )}
                />
                <Button type="submit" variant="contained" sx={{ minHeight: 44 }} disabled={isSubmitting}>
                  Create account
                </Button>
              </Stack>
            </Box>
            <Typography textAlign="center" color="text.secondary">
              Already have an account?{" "}
              <Link component={RouterLink} to="/sign-in" underline="hover">
                Sign in
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
