import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormHelperText,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from "@mui/material";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { EventPerson, UiSplitMode } from "./eventsService";

const entrySchema = z.object({
  type: z.enum(["EXPENSE", "INCOME"]),
  name: z.string().trim().min(1, "Entry name is required"),
  category: z.string().trim().min(1, "Category is required"),
  occurredLocal: z.string().min(1, "Date is required"),
  amount: z.string().trim().min(1, "Amount is required"),
  currency: z.string().trim().min(1, "Currency is required"),
  payerPersonId: z.string().trim().min(1, "Payer is required"),
  participantIds: z.array(z.string()).min(1, "Choose at least one participant"),
  splitMode: z.enum(["EVEN", "PERCENT", "AMOUNT"]),
  note: z.string().max(5000, "Notes can be up to 5000 characters"),
  shares: z.record(z.string(), z.string())
});

export type EntryComposerValues = z.infer<typeof entrySchema>;

type EntryComposerSubmitPayload = {
  type: "EXPENSE" | "INCOME";
  name: string;
  amount: string;
  currency: string;
  payerPersonId: string;
  occurredAtUtc: string;
  note?: string;
  participants: Array<{
    personId: string;
    splitMode: UiSplitMode;
    splitPercent?: string;
    splitAmount?: string;
  }>;
};

const PANEL_STYLE = {
  border: "1px solid #E7D7CC",
  borderRadius: 3,
  boxShadow: "0 4px 12px rgba(20,18,30,0.10)",
  bgcolor: "#FFFFFF"
} as const;

function parseNumber(value: string) {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function buildDefaultShares(people: EventPerson[]) {
  return people.reduce<Record<string, string>>((current, person) => {
    current[person.id] = "";
    return current;
  }, {});
}

function formatPercentShare(basisPoints: number) {
  const normalized = (basisPoints / 100).toFixed(2);
  return normalized.endsWith(".00") ? normalized.slice(0, -3) : normalized.endsWith("0") ? normalized.slice(0, -1) : normalized;
}

function resolvePercentAmount(totalAmount: number, shareValue: string) {
  const percent = parseNumber(shareValue);
  if (!Number.isFinite(totalAmount) || !Number.isFinite(percent)) {
    return Number.NaN;
  }

  return totalAmount * (percent / 100);
}

export function EntryComposer({
  eventCurrency,
  people,
  categories,
  onCancel,
  onSubmit
}: {
  eventCurrency: string;
  people: EventPerson[];
  categories: string[];
  onCancel: () => void;
  onSubmit: (payload: EntryComposerSubmitPayload) => Promise<void>;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [addParticipantId, setAddParticipantId] = useState("");
  const [touchedPercentIds, setTouchedPercentIds] = useState<string[]>([]);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm<EntryComposerValues>({
    resolver: zodResolver(entrySchema),
    mode: "onBlur",
    defaultValues: {
      type: "EXPENSE",
      name: "",
      category: categories[0] ?? "Food",
      occurredLocal: new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16),
      amount: "",
      currency: eventCurrency,
      payerPersonId: people[0]?.id ?? "",
      participantIds: people.map((person) => person.id),
      splitMode: "EVEN",
      note: "",
      shares: buildDefaultShares(people)
    }
  });

  const watchedType = useWatch({ control, name: "type" });
  const watchedAmount = useWatch({ control, name: "amount" });
  const watchedSplitMode = useWatch({ control, name: "splitMode" });
  const watchedParticipantIds = useWatch({ control, name: "participantIds" });
  const watchedShares = useWatch({ control, name: "shares" });
  const watchedCurrency = useWatch({ control, name: "currency" });

  const rebalancePercentShares = useCallback(
    (participantIds: string[], manuallyTouchedIds: string[], shareOverrides?: Record<string, string>) => {
      const nextShares = {
        ...getValues("shares"),
        ...(shareOverrides ?? {})
      };
      const relevantTouchedIds = manuallyTouchedIds.filter((personId) => participantIds.includes(personId));
      const untouchedIds = participantIds.filter((personId) => !relevantTouchedIds.includes(personId));

      const touchedBasisPoints = relevantTouchedIds.reduce((sum, personId) => {
        const value = parseNumber(nextShares[personId] ?? "");
        return sum + (Number.isFinite(value) ? Math.max(0, Math.round(value * 100)) : 0);
      }, 0);

      const remainingBasisPoints = Math.max(0, 10000 - touchedBasisPoints);
      if (untouchedIds.length > 0) {
        const baseShare = Math.floor(remainingBasisPoints / untouchedIds.length);
        let remainder = remainingBasisPoints - baseShare * untouchedIds.length;
        untouchedIds.forEach((personId) => {
          const allocation = baseShare + (remainder > 0 ? 1 : 0);
          if (remainder > 0) {
            remainder -= 1;
          }
          nextShares[personId] = formatPercentShare(allocation);
        });
      }

      setValue("shares", nextShares, { shouldDirty: true, shouldValidate: false });
    },
    [getValues, setValue]
  );

  useEffect(() => {
    const nextShares = { ...getValues("shares") };
    people.forEach((person) => {
      if (typeof nextShares[person.id] !== "string") {
        nextShares[person.id] = "";
      }
    });
    setValue("shares", nextShares, { shouldDirty: false });
  }, [getValues, people, setValue]);

  useEffect(() => {
    const relevantTouchedIds = touchedPercentIds.filter((personId) => watchedParticipantIds.includes(personId));
    if (relevantTouchedIds.length !== touchedPercentIds.length) {
      setTouchedPercentIds(relevantTouchedIds);
    }

    if (watchedSplitMode === "PERCENT") {
      rebalancePercentShares(watchedParticipantIds, relevantTouchedIds);
    }
  }, [rebalancePercentShares, touchedPercentIds, watchedParticipantIds, watchedSplitMode]);

  const selectedPeople = people.filter((person) => watchedParticipantIds.includes(person.id));
  const amountNumber = parseNumber(watchedAmount);
  const totalParticipants = selectedPeople.length;
  const evenShare = totalParticipants > 0 && Number.isFinite(amountNumber) ? amountNumber / totalParticipants : 0;

  let splitValidationMessage: string | null = null;
  if (watchedSplitMode === "PERCENT") {
    const totalPercent = selectedPeople.reduce((sum, person) => sum + (parseNumber(watchedShares[person.id] ?? "") || 0), 0);
    if (selectedPeople.length > 0 && Math.abs(totalPercent - 100) > 0.001) {
      splitValidationMessage = "Percent total must equal 100";
    }
  }

  if (watchedSplitMode === "AMOUNT") {
    const totalShareAmount = selectedPeople.reduce(
      (sum, person) => sum + (parseNumber(watchedShares[person.id] ?? "") || 0),
      0
    );
    if (selectedPeople.length > 0 && Number.isFinite(amountNumber) && Math.abs(totalShareAmount - amountNumber) > 0.001) {
      splitValidationMessage = `Split total must equal ${formatMoney(amountNumber, watchedCurrency || eventCurrency)}`;
    }
  }

  const availablePeople = people.filter((person) => !watchedParticipantIds.includes(person.id));

  const addParticipant = () => {
    if (!addParticipantId) {
      return;
    }
    const nextParticipantIds = [...watchedParticipantIds, addParticipantId];
    setValue("participantIds", nextParticipantIds, { shouldValidate: true, shouldDirty: true });
    if (watchedSplitMode === "PERCENT") {
      rebalancePercentShares(nextParticipantIds, touchedPercentIds);
    }
    setAddParticipantId("");
  };

  const removeParticipant = (personId: string) => {
    const nextParticipantIds = watchedParticipantIds.filter((id) => id !== personId);
    const nextTouchedPercentIds = touchedPercentIds.filter((id) => id !== personId);
    setValue(
      "participantIds",
      nextParticipantIds,
      { shouldValidate: true, shouldDirty: true }
    );
    setTouchedPercentIds(nextTouchedPercentIds);
    if (watchedSplitMode === "PERCENT") {
      rebalancePercentShares(nextParticipantIds, nextTouchedPercentIds);
    }
  };

  const submit = async (values: EntryComposerValues) => {
    setSubmitError(null);

    const normalizedAmount = parseNumber(values.amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setSubmitError("Enter an amount greater than 0.");
      return;
    }

    if (splitValidationMessage) {
      setSubmitError(splitValidationMessage);
      return;
    }

    try {
      await onSubmit({
        type: values.type,
        name: values.name.trim(),
        amount: normalizedAmount.toFixed(4),
        currency: values.currency,
        payerPersonId: values.payerPersonId,
        occurredAtUtc: new Date(values.occurredLocal).toISOString(),
        note: values.note.trim() || undefined,
        participants: values.participantIds.map((personId) => {
          if (values.splitMode === "PERCENT") {
            return {
              personId,
              splitMode: values.splitMode,
              splitPercent: (parseNumber(values.shares[personId] ?? "") || 0).toFixed(4)
            };
          }

          if (values.splitMode === "AMOUNT") {
            return {
              personId,
              splitMode: values.splitMode,
              splitAmount: (parseNumber(values.shares[personId] ?? "") || 0).toFixed(4)
            };
          }

          return {
            personId,
            splitMode: values.splitMode
          };
        })
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not add this entry yet.");
    }
  };

  return (
    <Box sx={{ ...PANEL_STYLE, p: { xs: 2, md: 2.5 } }}>
      <Stack
        component="form"
        spacing={2.5}
        onSubmit={handleSubmit(submit)}
        noValidate
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" component="h2" fontWeight={700}>
            Add entry
          </Typography>
          <Button variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
        </Stack>

        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Box sx={{ borderBottom: "1px solid #F3E4DA", pb: 0.5 }}>
              <ToggleButtonGroup
                exclusive
                value={field.value}
                onChange={(_, value) => {
                  if (value) {
                    field.onChange(value);
                  }
                }}
                size="small"
                sx={{
                  "& .MuiToggleButton-root": {
                    borderColor: "#F3E4DA",
                    textTransform: "none",
                    px: 2
                  },
                  "& .Mui-selected": {
                    bgcolor: "#FFF1E7 !important",
                    color: "#1F2937"
                  }
                }}
              >
                <ToggleButton value="EXPENSE">Expense</ToggleButton>
                <ToggleButton value="INCOME">Income</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}
        />

        {submitError ? <Alert severity="error">{submitError}</Alert> : null}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1.55fr 0.95fr" },
            gap: 2
          }}
        >
          <Box sx={{ ...PANEL_STYLE, p: { xs: 2, md: 2.5 } }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Basic details
            </Typography>

            <Stack spacing={2}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Entry name"
                    placeholder={watchedType === "EXPENSE" ? "Restaurant lunch" : "Refund from venue"}
                    error={Boolean(errors.name)}
                    helperText={errors.name?.message ?? "Use a short label that people will recognize."}
                    fullWidth
                  />
                )}
              />

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={Boolean(errors.category)}>
                      <InputLabel id="entry-category-label">Category</InputLabel>
                      <Select {...field} labelId="entry-category-label" label="Category">
                        {categories.map((category) => (
                          <MenuItem key={category} value={category}>
                            {category}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>
                        {errors.category?.message ?? "Category labels are shown in the UI, but persistence will follow the category API work."}
                      </FormHelperText>
                    </FormControl>
                  )}
                />

                <Controller
                  name="occurredLocal"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="datetime-local"
                      label="Date"
                      InputLabelProps={{ shrink: true }}
                      error={Boolean(errors.occurredLocal)}
                      helperText={errors.occurredLocal?.message ?? "Used for ordering and analytics grouping."}
                      fullWidth
                    />
                  )}
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <Controller
                  name="amount"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Amount"
                      placeholder="100.00"
                      error={Boolean(errors.amount)}
                      helperText={errors.amount?.message ?? "Use the event currency for now."}
                      fullWidth
                      InputProps={{
                        startAdornment: <InputAdornment position="start">{watchedCurrency === "EUR" ? "EUR" : watchedCurrency}</InputAdornment>
                      }}
                    />
                  )}
                />

                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={Boolean(errors.currency)}>
                      <InputLabel id="entry-currency-label">Currency</InputLabel>
                      <Select {...field} labelId="entry-currency-label" label="Currency">
                        <MenuItem value={eventCurrency}>{eventCurrency}</MenuItem>
                      </Select>
                      <FormHelperText>{errors.currency?.message ?? "Cross-currency entry conversion is not available yet."}</FormHelperText>
                    </FormControl>
                  )}
                />
              </Stack>

              <Typography variant="h6" fontWeight={700} sx={{ pt: 1 }}>
                Payer and participants
              </Typography>

              <Controller
                name="payerPersonId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={Boolean(errors.payerPersonId)}>
                    <InputLabel id="entry-payer-label">Payer</InputLabel>
                    <Select {...field} labelId="entry-payer-label" label="Payer">
                      {people.map((person) => (
                        <MenuItem key={person.id} value={person.id}>
                          {person.displayName}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>{errors.payerPersonId?.message ?? "Who paid or received the amount."}</FormHelperText>
                  </FormControl>
                )}
              />

              <Controller
                name="participantIds"
                control={control}
                render={() => (
                  <Stack spacing={1.25}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {selectedPeople.map((person) => (
                        <Chip
                          key={person.id}
                          label={person.displayName}
                          onDelete={() => removeParticipant(person.id)}
                          sx={{ borderRadius: 2 }}
                        />
                      ))}
                    </Stack>

                    <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                      <FormControl fullWidth error={Boolean(errors.participantIds)}>
                        <InputLabel id="entry-add-participant-label">Add person</InputLabel>
                        <Select
                          labelId="entry-add-participant-label"
                          label="Add person"
                          value={addParticipantId}
                          onChange={(event) => setAddParticipantId(event.target.value)}
                        >
                          {availablePeople.length === 0 ? (
                            <MenuItem value="" disabled>
                              Everyone is already included
                            </MenuItem>
                          ) : (
                            availablePeople.map((person) => (
                              <MenuItem key={person.id} value={person.id}>
                                {person.displayName}
                              </MenuItem>
                            ))
                          )}
                        </Select>
                        <FormHelperText>{errors.participantIds?.message ?? "Choose who shares this entry."}</FormHelperText>
                      </FormControl>
                      <Button variant="outlined" sx={{ minWidth: 124, height: 56 }} onClick={addParticipant}>
                        Add person
                      </Button>
                    </Stack>
                  </Stack>
                )}
              />
            </Stack>
          </Box>

          <Box sx={{ display: "grid", gap: 2 }}>
            <Box sx={{ ...PANEL_STYLE, p: { xs: 2, md: 2.5 } }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Split mode
              </Typography>

              <Controller
                name="splitMode"
                control={control}
                render={({ field }) => (
                  <ToggleButtonGroup
                    exclusive
                    value={field.value}
                    onChange={(_, value) => {
                      if (value) {
                        field.onChange(value);
                      }
                    }}
                    size="small"
                    sx={{
                      mb: 1.5,
                      "& .MuiToggleButton-root": {
                        borderColor: "#F3E4DA",
                        textTransform: "none",
                        px: 2
                      },
                      "& .Mui-selected": {
                        bgcolor: "#2BB8A5 !important",
                        borderColor: "#2BB8A5 !important",
                        color: "#FFFFFF"
                      }
                    }}
                  >
                    <ToggleButton value="EVEN">Even</ToggleButton>
                    <ToggleButton value="PERCENT">Percent</ToggleButton>
                    <ToggleButton value="AMOUNT">Amount</ToggleButton>
                  </ToggleButtonGroup>
                )}
              />

              <Alert
                icon={<WarningAmberRoundedIcon fontSize="inherit" />}
                severity={splitValidationMessage ? "warning" : "info"}
                sx={{ mb: 1.5, bgcolor: "#FFF1E7", color: "#6B4B35", "& .MuiAlert-icon": { color: "#D97706" } }}
              >
                {watchedSplitMode === "EVEN" && totalParticipants > 0 && Number.isFinite(amountNumber)
                  ? `Each participant pays ${formatMoney(evenShare, watchedCurrency || eventCurrency)}`
                  : splitValidationMessage ?? "Set each participant share for this split mode."}
              </Alert>

              <Stack spacing={1}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns:
                      watchedSplitMode === "EVEN"
                        ? "1fr auto"
                        : watchedSplitMode === "PERCENT"
                          ? "1fr 104px 132px"
                          : "1fr 110px",
                    gap: 1,
                    px: 1,
                    alignItems: "center"
                  }}
                >
                  <Typography variant="body2" fontWeight={700}>
                    Name
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {watchedSplitMode === "PERCENT" ? "Percent" : "Share"}
                  </Typography>
                  {watchedSplitMode === "PERCENT" ? (
                    <Typography variant="body2" fontWeight={700}>
                      Resolved
                    </Typography>
                  ) : null}
                </Box>

                {selectedPeople.map((person) => (
                  <Box
                    key={person.id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns:
                        watchedSplitMode === "EVEN"
                          ? "1fr auto"
                          : watchedSplitMode === "PERCENT"
                            ? "1fr 104px 132px"
                            : "1fr 110px",
                      gap: 1,
                      alignItems: "center",
                      minHeight: 52,
                      px: 1.25,
                      border: "1px solid #F3E4DA",
                      borderRadius: 2
                    }}
                  >
                    <Typography>{person.displayName}</Typography>
                    {watchedSplitMode === "EVEN" ? (
                      <Typography fontWeight={600}>
                        {Number.isFinite(evenShare) ? formatMoney(evenShare, watchedCurrency || eventCurrency) : "—"}
                      </Typography>
                    ) : (
                      <>
                        <TextField
                          size="small"
                          value={watchedShares[person.id] ?? ""}
                          onChange={(event) => {
                            if (watchedSplitMode === "PERCENT") {
                              const nextTouchedIds = touchedPercentIds.includes(person.id)
                                ? touchedPercentIds
                                : [...touchedPercentIds, person.id];
                              setTouchedPercentIds(nextTouchedIds);
                              rebalancePercentShares(watchedParticipantIds, nextTouchedIds, {
                                [person.id]: event.target.value
                              });
                              return;
                            }

                            setValue(`shares.${person.id}`, event.target.value, {
                              shouldDirty: true,
                              shouldValidate: false
                            });
                          }}
                          placeholder={watchedSplitMode === "PERCENT" ? "25" : "25.00"}
                          inputProps={{
                            "aria-label": `${person.displayName} share`,
                            inputMode: "decimal"
                          }}
                        />
                        {watchedSplitMode === "PERCENT" ? (
                          <TextField
                            size="small"
                            value={
                              Number.isFinite(resolvePercentAmount(amountNumber, watchedShares[person.id] ?? ""))
                                ? formatMoney(
                                    resolvePercentAmount(amountNumber, watchedShares[person.id] ?? ""),
                                    watchedCurrency || eventCurrency
                                  )
                                : "—"
                            }
                            inputProps={{
                              "aria-label": `${person.displayName} resolved amount`,
                              readOnly: true
                            }}
                          />
                        ) : null}
                      </>
                    )}
                  </Box>
                ))}
              </Stack>

              <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.5 }}>
                <Typography fontWeight={700}>Total:</Typography>
                <Typography fontWeight={700}>
                  {watchedSplitMode === "PERCENT"
                    ? `${selectedPeople.reduce((sum, person) => sum + (parseNumber(watchedShares[person.id] ?? "") || 0), 0).toFixed(2)}%`
                    : formatMoney(
                        watchedSplitMode === "EVEN"
                          ? (Number.isFinite(evenShare) ? evenShare * totalParticipants : 0)
                          : selectedPeople.reduce(
                              (sum, person) => sum + (parseNumber(watchedShares[person.id] ?? "") || 0),
                              0
                            ),
                        watchedCurrency || eventCurrency
                      )}
                </Typography>
              </Stack>
            </Box>

            <Box sx={{ ...PANEL_STYLE, p: { xs: 2, md: 2.5 } }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Notes and receipt
              </Typography>

              <Controller
                name="note"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Add notes"
                    placeholder="Add notes"
                    multiline
                    minRows={3}
                    error={Boolean(errors.note)}
                    helperText={errors.note?.message ?? "Notes are optional and help people understand the entry."}
                    fullWidth
                  />
                )}
              />

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, color: "#667085" }}>
                <CloudUploadOutlinedIcon fontSize="small" />
                <Typography variant="body2">PNG, JPG, PDF up to 10MB</Typography>
              </Stack>
            </Box>
          </Box>
        </Box>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Button variant="outlined" disabled>
            Save draft
          </Button>
          <Stack direction="row" spacing={1}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              Add entry
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
