import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography
} from "@mui/material";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { updatePreferences } from "../api/profileService";

const preferencesSchema = z.object({
  preferredCurrency: z
    .string()
    .trim()
    .min(3, "Select a valid currency code")
    .max(3, "Select a valid currency code")
});

type PreferencesFormValues = z.infer<typeof preferencesSchema>;

const currencyOptions = ["EUR", "USD", "BRL"];

export function ProfilePreferencesForm() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful }
  } = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      preferredCurrency: "EUR"
    },
    mode: "onBlur"
  });

  const onSubmit = async (values: PreferencesFormValues) => {
    await updatePreferences(values);
  };

  return (
    <Card sx={{ boxShadow: "0 4px 12px rgba(20,18,30,0.10)", border: "1px solid #E7D7CC" }}>
      <CardContent>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" component="h1" fontWeight={700}>
              Profile preferences
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update your default currency for new entries.
            </Typography>
          </Box>
          {isSubmitSuccessful ? (
            <Alert icon={<CheckCircleOutlineRoundedIcon fontSize="inherit" />} severity="success">
              Preferences updated successfully.
            </Alert>
          ) : null}
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2.5}>
              <Controller
                name="preferredCurrency"
                control={control}
                render={({ field }) => (
                  <FormControl error={Boolean(errors.preferredCurrency)}>
                    <InputLabel id="preferred-currency-label">Preferred currency</InputLabel>
                    <Select
                      {...field}
                      labelId="preferred-currency-label"
                      label="Preferred currency"
                      inputProps={{ "aria-label": "Preferred currency" }}
                    >
                      {currencyOptions.map((currency) => (
                        <MenuItem key={currency} value={currency}>
                          {currency}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      {errors.preferredCurrency?.message ?? "Used as the default in entry forms."}
                    </FormHelperText>
                  </FormControl>
                )}
              />
              <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ minHeight: 44 }}>
                Save changes
              </Button>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
