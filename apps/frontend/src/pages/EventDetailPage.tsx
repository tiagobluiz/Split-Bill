import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Link as RouterLink, useParams } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../auth/AuthContext";
import {
  addEventPerson,
  apiErrorMessage,
  createEntry,
  EventBalance,
  EventDetails,
  fetchEventBalances,
  fetchEventDetails,
  updateEventSettings
} from "../events/eventsService";
import { EntryComposer } from "../events/EntryComposer";
import { PageZone } from "../layout/AppShell";

const settingsSchema = z.object({
  eventName: z.string().trim().min(1, "Event name is required"),
  baseCurrency: z.string().trim().min(1, "Base currency is required"),
  timezone: z.string().trim().min(1, "Timezone is required"),
  settlementAlgorithm: z.enum(["min-transfer", "pairwise"])
});

type SettingsValues = z.infer<typeof settingsSchema>;

const ALGORITHM_HELP = {
  "min-transfer": "Reduces the total number of payments needed to settle everyone.",
  pairwise: "Settles each debtor and creditor directly, which can increase transfers."
} as const;

const BUBBLE_STYLE = {
  border: "1px solid #E7D7CC",
  borderRadius: 3,
  boxShadow: "0 4px 12px rgba(20,18,30,0.10)",
  p: { xs: 2, md: 2.5 },
  bgcolor: "#FFFFFF"
} as const;

const DEFAULT_CATEGORIES = ["Food", "Transport", "Lodging"];

function parseDecimal(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function resolveBalanceStatus(netAmount: number) {
  if (netAmount > 0.0001) {
    return { label: "You'll get back", tone: "success" as const };
  }

  if (netAmount < -0.0001) {
    return { label: "You'll send", tone: "warning" as const };
  }

  return { label: "All square", tone: "default" as const };
}

export function EventDetailPage() {
  const { eventId } = useParams();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [eventData, setEventData] = useState<EventDetails | null>(null);
  const [balancesData, setBalancesData] = useState<{
    currency: string;
    algorithm: "min-transfer" | "pairwise";
    balances: EventBalance[];
  } | null>(null);
  const [isBalancesLoading, setIsBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);
  const [selectedBalancesAlgorithm, setSelectedBalancesAlgorithm] = useState<"min-transfer" | "pairwise">("min-transfer");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [participantInput, setParticipantInput] = useState("");
  const [participantError, setParticipantError] = useState<string | null>(null);
  const [defaultCategories, setDefaultCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [settingsSaveError, setSettingsSaveError] = useState<string | null>(null);

  const savedSettingsRef = useRef<SettingsValues | null>(null);

  const {
    control,
    reset,
    formState: { errors }
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    mode: "onBlur",
    defaultValues: {
      eventName: "",
      baseCurrency: "EUR",
      timezone: "Europe/Paris",
      settlementAlgorithm: "min-transfer"
    }
  });

  const watchedSettings = useWatch({ control });

  useEffect(() => {
    if (!eventId) {
      setIsLoading(false);
      setErrorMessage("Event not found.");
      return;
    }

    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      setSettingsSaveError(null);
      try {
        const details = await fetchEventDetails(eventId);
        if (!isMounted) {
          return;
        }
        setEventData(details);
        const nextSettings: SettingsValues = {
          eventName: details.event.name,
          baseCurrency: details.event.currency,
          timezone: details.event.timezone,
          settlementAlgorithm: details.event.settlementAlgorithm
        };
        setSelectedBalancesAlgorithm(details.event.settlementAlgorithm);
        savedSettingsRef.current = nextSettings;
        reset(nextSettings);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(await apiErrorMessage(error, "Could not load this event yet."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [eventId, reset]);

  useEffect(() => {
    if (!eventData || !savedSettingsRef.current) {
      return;
    }

    if (
      !watchedSettings.eventName ||
      !watchedSettings.baseCurrency ||
      !watchedSettings.timezone ||
      !watchedSettings.settlementAlgorithm
    ) {
      return;
    }

    if (
      errors.eventName ||
      errors.baseCurrency ||
      errors.timezone ||
      errors.settlementAlgorithm
    ) {
      return;
    }

    const nextSettings: SettingsValues = {
      eventName: watchedSettings.eventName.trim(),
      baseCurrency: watchedSettings.baseCurrency,
      timezone: watchedSettings.timezone,
      settlementAlgorithm: watchedSettings.settlementAlgorithm
    };

    const unchanged =
      savedSettingsRef.current.eventName === nextSettings.eventName &&
      savedSettingsRef.current.baseCurrency === nextSettings.baseCurrency &&
      savedSettingsRef.current.timezone === nextSettings.timezone &&
      savedSettingsRef.current.settlementAlgorithm === nextSettings.settlementAlgorithm;

    if (unchanged) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        await updateEventSettings(eventData.event.id, {
          name: nextSettings.eventName,
          timezone: nextSettings.timezone,
          settlementAlgorithm: nextSettings.settlementAlgorithm
        });

        savedSettingsRef.current = nextSettings;
        setEventData((current) =>
          current
            ? {
                ...current,
                event: {
                  ...current.event,
                  name: nextSettings.eventName,
                  timezone: nextSettings.timezone,
                  settlementAlgorithm: nextSettings.settlementAlgorithm
                }
              }
            : current
        );
        setSettingsSaveError(null);
      } catch (error) {
        setSettingsSaveError(await apiErrorMessage(error, "Could not save settings yet."));
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [errors, eventData, watchedSettings]);

  useEffect(() => {
    if (!eventData || activeTab !== 1) {
      return;
    }

    let isMounted = true;

    const loadBalances = async () => {
      setIsBalancesLoading(true);
      setBalancesError(null);
      try {
        const balances = await fetchEventBalances(eventData.event.id, selectedBalancesAlgorithm);
        if (!isMounted) {
          return;
        }
        setBalancesData({
          currency: balances.currency,
          algorithm: balances.algorithm,
          balances: balances.balances
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setBalancesError(await apiErrorMessage(error, "Could not load balances yet."));
      } finally {
        if (isMounted) {
          setIsBalancesLoading(false);
        }
      }
    };

    void loadBalances();

    return () => {
      isMounted = false;
    };
  }, [activeTab, eventData, selectedBalancesAlgorithm]);

  const peopleRows = useMemo(() => eventData?.people ?? [], [eventData]);
  const entryCategories = useMemo(
    () => [...defaultCategories, ...customCategories].filter((value, index, current) => current.indexOf(value) === index),
    [customCategories, defaultCategories]
  );
  const currentPerson = useMemo(
    () => peopleRows.find((person) => person.linkedAccountId === session?.accountId) ?? null,
    [peopleRows, session?.accountId]
  );
  const currentBalance = useMemo(
    () => balancesData?.balances.find((balance) => balance.personId === currentPerson?.id) ?? null,
    [balancesData, currentPerson?.id]
  );
  const summaryCards = useMemo(() => {
    if (!balancesData) {
      return [
        { label: "You'll get back", value: "—", tone: "success" as const },
        { label: "You'll send", value: "—", tone: "warning" as const },
        { label: "Net", value: "—", tone: "default" as const }
      ];
    }

    if (currentBalance) {
      const getsBack = currentBalance.owedBy.reduce((sum, entry) => sum + parseDecimal(entry.amount), 0);
      const sends = currentBalance.owes.reduce((sum, entry) => sum + parseDecimal(entry.amount), 0);
      const net = parseDecimal(currentBalance.netAmount);
      return [
        { label: "You'll get back", value: formatMoney(getsBack, balancesData.currency), tone: "success" as const },
        { label: "You'll send", value: formatMoney(sends, balancesData.currency), tone: "warning" as const },
        { label: "Net", value: formatMoney(net, balancesData.currency), tone: "default" as const }
      ];
    }

    const getsBack = balancesData.balances
      .reduce((sum, balance) => sum + Math.max(parseDecimal(balance.netAmount), 0), 0);
    const sends = balancesData.balances
      .reduce((sum, balance) => sum + Math.max(-parseDecimal(balance.netAmount), 0), 0);

    return [
      { label: "To receive", value: formatMoney(getsBack, balancesData.currency), tone: "success" as const },
      { label: "To send", value: formatMoney(sends, balancesData.currency), tone: "warning" as const },
      { label: "Net", value: formatMoney(getsBack - sends, balancesData.currency), tone: "default" as const }
    ];
  }, [balancesData, currentBalance]);
  const settlementInstructions = useMemo(() => {
    if (!balancesData) {
      return [];
    }

    return balancesData.balances.flatMap((balance) =>
      balance.owes.map((entry, index) => ({
        id: `${balance.personId}-${entry.counterpartyPersonId}-${index}`,
        fromPersonName: peopleRows.find((person) => person.id === balance.personId)?.displayName ?? "Unknown",
        toPersonName: peopleRows.find((person) => person.id === entry.counterpartyPersonId)?.displayName ?? "Unknown",
        amount: formatMoney(parseDecimal(entry.amount), entry.currency)
      }))
    );
  }, [balancesData, peopleRows]);

  const addParticipant = async () => {
    const normalized = participantInput.trim();
    if (!normalized) {
      setParticipantError("Add a person name to continue.");
      return;
    }

    if (peopleRows.some((entry) => entry.displayName.toLowerCase() === normalized.toLowerCase())) {
      setParticipantError("This person is already added");
      return;
    }

    if (!eventData) {
      return;
    }

    try {
      const created = await addEventPerson(eventData.event.id, normalized);
      setEventData((current) =>
        current
          ? {
              ...current,
              people: [...current.people, created]
            }
          : current
      );
      setParticipantInput("");
      setParticipantError(null);
    } catch (error) {
      setParticipantError(await apiErrorMessage(error, "Could not add this person yet."));
    }
  };

  const addCustomCategory = () => {
    const normalized = customCategoryInput.trim();
    if (!normalized) {
      setCategoryError("Category name is required.");
      return;
    }
    const duplicate = [...defaultCategories, ...customCategories].some(
      (entry) => entry.toLowerCase() === normalized.toLowerCase()
    );
    if (duplicate) {
      setCategoryError("This category is already available.");
      return;
    }
    setCategoryError(null);
    setCustomCategories((current) => [...current, normalized]);
    setCustomCategoryInput("");
  };

  const handleCreateEntry = async (payload: Parameters<typeof createEntry>[0]) => {
    if (!eventData) {
      return;
    }

    const createdEntry = await createEntry(payload);
    setEventData((current) =>
      current
        ? {
            ...current,
            entries: [createdEntry, ...current.entries]
          }
        : current
    );
    setIsComposerOpen(false);
  };

  if (isLoading) {
    return <Alert severity="info">Loading event...</Alert>;
  }

  if (!eventData) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning">{errorMessage ?? "Event not found."}</Alert>
        <Button component={RouterLink} to="/app/dashboard" variant="contained">
          Back to dashboard
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
          {eventData.event.name}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          {eventData.event.currency} | {eventData.event.timezone}
        </Typography>
      </Box>

      <PageZone title="Event">
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} aria-label="Event tabs">
          <Tab label="Entries" />
          <Tab label="Balances" />
          <Tab label="Settings" />
        </Tabs>
      </PageZone>

      {activeTab === 0 ? (
        <PageZone
          title="Entries"
          action={
            <Button variant="contained" onClick={() => setIsComposerOpen(true)}>
              Add entry
            </Button>
          }
        >
          {isComposerOpen ? (
            <Box sx={{ mb: 2 }}>
              <EntryComposer
                eventCurrency={eventData.event.currency}
                people={peopleRows}
                categories={entryCategories}
                onCancel={() => setIsComposerOpen(false)}
                onSubmit={async (payload) =>
                  handleCreateEntry({
                    ...payload,
                    eventId: eventData.event.id
                  })
                }
              />
            </Box>
          ) : null}
          {eventData.entries.length === 0 ? (
            <Alert severity="info">No entries yet for this event.</Alert>
          ) : (
            <Stack spacing={1.5}>
              {eventData.entries.map((entry) => {
                const payer = peopleRows.find((person) => person.id === entry.payerPersonId)?.displayName ?? "Unknown";
                return (
                  <Box key={entry.id} sx={{ border: "1px solid #E7D7CC", borderRadius: 2, p: 2 }}>
                    <Typography fontWeight={600}>{entry.name}</Typography>
                    <Typography color="text.secondary">
                      {entry.amount} {entry.currency} | Paid by {payer}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          )}
        </PageZone>
      ) : activeTab === 1 ? (
        <Stack spacing={2}>
          <PageZone
            title="Balances"
            action={
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                <FormControl sx={{ minWidth: { xs: "100%", md: 220 } }}>
                  <InputLabel id="balances-algorithm-label">Settlement algorithm</InputLabel>
                  <Select
                    labelId="balances-algorithm-label"
                    label="Settlement algorithm"
                    value={selectedBalancesAlgorithm}
                    onChange={(event) =>
                      setSelectedBalancesAlgorithm(event.target.value as "min-transfer" | "pairwise")
                    }
                  >
                    <MenuItem value="min-transfer">Min transfer</MenuItem>
                    <MenuItem value="pairwise">Pairwise</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setIsResetDialogOpen(true)}
                  sx={{ minHeight: 44 }}
                >
                  Reset draft settlements
                </Button>
              </Stack>
            }
          >
            {balancesError ? <Alert severity="error" sx={{ mb: 2 }}>{balancesError}</Alert> : null}
            {!currentPerson && balancesData ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Your account is not linked to a person in this event yet. Summary cards show event-wide totals.
              </Alert>
            ) : null}
            {isBalancesLoading ? (
              <Alert severity="info">Loading balances...</Alert>
            ) : (
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                    gap: 2
                  }}
                >
                  {summaryCards.map((card) => (
                    <Box key={card.label} sx={BUBBLE_STYLE}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                        {card.label}
                      </Typography>
                      <Typography variant="h4" fontWeight={700} sx={{ color: card.tone === "success" ? "#1F9D55" : card.tone === "warning" ? "#D97706" : "#1F2937" }}>
                        {card.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", lg: "1.15fr 0.85fr" },
                    gap: 2
                  }}
                >
                  <Box sx={BUBBLE_STYLE}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
                      Who sends to whom
                    </Typography>
                    {settlementInstructions.length === 0 ? (
                      <Alert severity="success">Everyone is settled. No transfers are needed.</Alert>
                    ) : (
                      <Stack spacing={1}>
                        {settlementInstructions.map((instruction) => (
                          <Box
                            key={instruction.id}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 2,
                              minHeight: 56,
                              px: 1.5,
                              py: 1.25,
                              border: "1px solid #F3E4DA",
                              borderRadius: 2,
                              bgcolor: "#FFFDFC"
                            }}
                          >
                            <Typography>
                              {instruction.fromPersonName} pays {instruction.toPersonName}
                            </Typography>
                            <Chip
                              label={instruction.amount}
                              sx={{
                                borderRadius: 999,
                                bgcolor: "#FFF1E7",
                                border: "1px solid #E7D7CC",
                                fontWeight: 700
                              }}
                            />
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Box>

                  <Box sx={BUBBLE_STYLE}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
                      Person net
                    </Typography>
                    <Stack spacing={1}>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1.25fr 110px 132px",
                          gap: 1,
                          px: 1.5,
                          alignItems: "center"
                        }}
                      >
                        <Typography variant="body2" fontWeight={700}>
                          Person
                        </Typography>
                        <Typography variant="body2" fontWeight={700} textAlign="right">
                          Net amount
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                          Status
                        </Typography>
                      </Box>
                      {(balancesData?.balances ?? []).map((balance) => {
                        const netAmount = parseDecimal(balance.netAmount);
                        const status = resolveBalanceStatus(netAmount);
                        return (
                          <Box
                            key={balance.personId}
                            sx={{
                              display: "grid",
                              gridTemplateColumns: "1.25fr 110px 132px",
                              gap: 1,
                              alignItems: "center",
                              minHeight: 52,
                              px: 1.5,
                              border: "1px solid #F3E4DA",
                              borderRadius: 2
                            }}
                          >
                            <Typography>
                              {peopleRows.find((person) => person.id === balance.personId)?.displayName ?? "Unknown"}
                            </Typography>
                            <Typography textAlign="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                              {formatMoney(netAmount, balancesData?.currency ?? eventData.event.currency)}
                            </Typography>
                            <Chip
                              label={status.label}
                              size="small"
                              sx={{
                                justifySelf: "start",
                                borderRadius: 999,
                                bgcolor:
                                  status.tone === "success"
                                    ? "#E8F7EE"
                                    : status.tone === "warning"
                                      ? "#FFF4E5"
                                      : "#F8F5F2",
                                color:
                                  status.tone === "success"
                                    ? "#1F9D55"
                                    : status.tone === "warning"
                                      ? "#B45309"
                                      : "#475467",
                                border: "1px solid #E7D7CC"
                              }}
                            />
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                </Box>
              </Stack>
            )}
          </PageZone>

          <Dialog open={isResetDialogOpen} onClose={() => setIsResetDialogOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle>Reset draft settlements</DialogTitle>
            <DialogContent>
              <Typography color="text.secondary">
                This clears any draft settlement review state in this screen. Saved event balances are recalculated from entries.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setIsResetDialogOpen(false)}>Cancel</Button>
              <Button color="error" variant="outlined" onClick={() => setIsResetDialogOpen(false)}>
                Reset
              </Button>
            </DialogActions>
          </Dialog>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Box sx={BUBBLE_STYLE}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Trip details
            </Typography>
            {settingsSaveError ? <Alert severity="error" sx={{ mb: 1.5 }}>{settingsSaveError}</Alert> : null}
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <Controller
                name="eventName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Trip name"
                    error={Boolean(errors.eventName)}
                    helperText={errors.eventName?.message}
                    fullWidth
                  />
                )}
              />
              <Controller
                name="baseCurrency"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={Boolean(errors.baseCurrency)}>
                    <InputLabel id="settings-currency-label">Base currency</InputLabel>
                    <Select
                      {...field}
                      labelId="settings-currency-label"
                      label="Base currency"
                      disabled
                    >
                      <MenuItem value="EUR">EUR</MenuItem>
                      <MenuItem value="USD">USD</MenuItem>
                    </Select>
                    <FormHelperText>{errors.baseCurrency?.message ?? "Base currency cannot be changed yet."}</FormHelperText>
                  </FormControl>
                )}
              />
              <Controller
                name="timezone"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={Boolean(errors.timezone)}>
                    <InputLabel id="settings-timezone-label">Timezone</InputLabel>
                    <Select {...field} labelId="settings-timezone-label" label="Timezone">
                      <MenuItem value="Europe/Paris">Europe/Paris</MenuItem>
                      <MenuItem value="Europe/Lisbon">Europe/Lisbon</MenuItem>
                    </Select>
                    <FormHelperText>{errors.timezone?.message}</FormHelperText>
                  </FormControl>
                )}
              />
            </Stack>

            <Controller
              name="settlementAlgorithm"
              control={control}
              render={({ field }) => (
                <FormControl sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    Default settlement algorithm
                  </Typography>
                  <RadioGroup {...field} row>
                    <FormControlLabel
                      value="min-transfer"
                      control={<Radio />}
                      label={
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography>Min transfer</Typography>
                          <Tooltip title={ALGORITHM_HELP["min-transfer"]}>
                            <IconButton size="small" aria-label="Min transfer description">
                              <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      }
                    />
                    <FormControlLabel
                      value="pairwise"
                      control={<Radio />}
                      label={
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography>Pairwise</Typography>
                          <Tooltip title={ALGORITHM_HELP.pairwise}>
                            <IconButton size="small" aria-label="Pairwise description">
                              <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      }
                    />
                  </RadioGroup>
                </FormControl>
              )}
            />
          </Box>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Box sx={{ ...BUBBLE_STYLE, flex: 1 }}>
              <Typography variant="h6" sx={{ mb: 1.5 }}>
                People
              </Typography>
              <Stack spacing={1}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1.5fr 1.6fr 1fr 88px",
                    gap: 1,
                    px: 1.5,
                    justifyItems: "start",
                    alignItems: "center"
                  }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    Name
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    Linked account
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    Role
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    Actions
                  </Typography>
                </Box>
                {peopleRows.map((person) => (
                  <Box
                    key={person.id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1.6fr 1fr 88px",
                      gap: 1,
                      alignItems: "center",
                      justifyItems: "start",
                      minHeight: 52,
                      border: "1px solid #F3E4DA",
                      borderRadius: 2,
                      px: 1.5
                    }}
                  >
                    <Typography>{person.displayName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {person.linkedAccountId ?? "Not linked"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Member
                    </Typography>
                    <Tooltip title="Person removal is not available in the current API contract.">
                      <span>
                        <IconButton size="small" aria-label={`Remove ${person.displayName}`} disabled>
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                ))}
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "flex-start" }} sx={{ mt: 1.5 }}>
                <TextField
                  label="Add person"
                  value={participantInput}
                  onChange={(entry) => setParticipantInput(entry.target.value)}
                  onKeyDown={(entry) => {
                    if (entry.key === "Enter") {
                      entry.preventDefault();
                      void addParticipant();
                    }
                  }}
                  error={Boolean(participantError)}
                  helperText={participantError ?? "Manage participants linked to this event."}
                  fullWidth
                />
                <Button type="button" variant="outlined" sx={{ height: 56, minHeight: 56, minWidth: 124 }} onClick={() => void addParticipant()}>
                  Add person
                </Button>
              </Stack>
            </Box>

            <Box sx={{ ...BUBBLE_STYLE, flex: 1 }}>
              <Typography variant="h6" sx={{ mb: 1.5 }}>
                Categories
              </Typography>
              <Alert severity="info" sx={{ mb: 1.5 }}>
                Changes here affect entry forms and analytics grouping. Category sync API is not available yet.
              </Alert>

              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Default categories
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                {defaultCategories.map((category) => (
                  <Stack
                    key={category}
                    direction="row"
                    alignItems="center"
                    spacing={0.5}
                    sx={{ border: "1px solid #E7D7CC", borderRadius: 999, pr: 0.5 }}
                  >
                    <Chip label={category} color="secondary" variant="outlined" />
                    <IconButton
                      size="small"
                      aria-label={`Remove category ${category}`}
                      onClick={() =>
                        setDefaultCategories((current) => current.filter((entry) => entry !== category))
                      }
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>

              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Custom categories
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "flex-start" }}>
                <TextField
                  label="Add category"
                  value={customCategoryInput}
                  onChange={(entry) => setCustomCategoryInput(entry.target.value)}
                  onKeyDown={(entry) => {
                    if (entry.key === "Enter") {
                      entry.preventDefault();
                      addCustomCategory();
                    }
                  }}
                  error={Boolean(categoryError)}
                  helperText={categoryError ?? "Add custom categories for this event."}
                  fullWidth
                />
                <Button type="button" variant="outlined" sx={{ height: 56, minWidth: 124 }} onClick={addCustomCategory}>
                  Add category
                </Button>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                {customCategories.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No custom categories yet.
                  </Typography>
                ) : (
                  customCategories.map((category) => (
                    <Stack
                      key={category}
                      direction="row"
                      alignItems="center"
                      spacing={0.5}
                      sx={{ border: "1px solid #E7D7CC", borderRadius: 999, pr: 0.5 }}
                    >
                      <Chip label={category} />
                      <IconButton
                        size="small"
                        aria-label={`Remove category ${category}`}
                        onClick={() =>
                          setCustomCategories((current) => current.filter((entry) => entry !== category))
                        }
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))
                )}
              </Stack>
            </Box>
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}
