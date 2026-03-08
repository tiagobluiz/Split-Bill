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
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { z } from "zod";
import {
  apiErrorMessage,
  createEvent,
  EventSummary,
  fetchEvents
} from "../events/eventsService";
import { PageZone, PrimaryActionButton } from "../layout/AppShell";

const eventFormSchema = z.object({
  eventName: z.string().trim().min(1, "Event name is required"),
  baseCurrency: z.string().trim().min(1, "Base currency is required"),
  timezone: z.string().trim().min(1, "Timezone is required"),
  settlementAlgorithm: z.enum(["min-transfer", "pairwise"]),
  description: z.string().trim().max(300, "Description can be up to 300 characters").optional()
});

type EventFormValues = z.infer<typeof eventFormSchema>;

const ALGORITHM_HELP = {
  "min-transfer": "Reduces the total number of payments needed to settle everyone.",
  pairwise: "Settles each debtor/creditor pair directly, even with more total transfers."
} as const;

export function DashboardPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsLoadError, setEventsLoadError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [participantInput, setParticipantInput] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantError, setParticipantError] = useState<string | null>(null);
  const [formErrorSummary, setFormErrorSummary] = useState<string[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    mode: "onBlur",
    defaultValues: {
      eventName: "",
      baseCurrency: "EUR",
      timezone: "Europe/Paris",
      settlementAlgorithm: "min-transfer",
      description: ""
    }
  });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoadingEvents(true);
      setEventsLoadError(null);
      try {
        const items = await fetchEvents();
        if (!isMounted) {
          return;
        }
        setEvents(items);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setEventsLoadError(await apiErrorMessage(error, "Could not load events yet. Try again."));
      } finally {
        if (isMounted) {
          setIsLoadingEvents(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const matchesSearch =
          searchTerm.trim().length === 0 ||
          event.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
        const matchesStatus = statusFilter === "all" || statusFilter === "active";
        const matchesCurrency = currencyFilter === "all" || event.currency === currencyFilter;
        return matchesSearch && matchesStatus && matchesCurrency;
      }),
    [currencyFilter, events, searchTerm, statusFilter]
  );

  const openDialog = () => {
    setFormErrorSummary([]);
    setParticipantError(null);
    setIsCreateDialogOpen(true);
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setFormErrorSummary([]);
  };

  const addParticipant = () => {
    const normalized = participantInput.trim();
    if (!normalized) {
      setParticipantError("Add at least one person to continue.");
      return;
    }

    const duplicate = participants.some((entry) => entry.toLowerCase() === normalized.toLowerCase());
    if (duplicate) {
      setParticipantError("This person is already added");
      return;
    }

    setParticipantError(null);
    setParticipants((current) => [...current, normalized]);
    setParticipantInput("");
  };

  const onSubmit = async (values: EventFormValues) => {
    if (participants.length === 0) {
      setParticipantError("Add at least one person to continue.");
      setFormErrorSummary(["Participants are required."]);
      return;
    }

    const normalizedName = values.eventName.trim();
    const duplicateEvent = events.some((event) => event.name.toLowerCase() === normalizedName.toLowerCase());
    if (duplicateEvent) {
      setFormErrorSummary(["An event with this name already exists."]);
      return;
    }

    try {
      const newEvent = await createEvent({
        name: normalizedName,
        currency: values.baseCurrency,
        timezone: values.timezone,
        settlementAlgorithm: values.settlementAlgorithm,
        participants
      });

      setEvents((current) => [newEvent, ...current]);
      setParticipants([]);
      setParticipantInput("");
      setParticipantError(null);
      setFormErrorSummary([]);
      reset({
        eventName: "",
        baseCurrency: values.baseCurrency,
        timezone: values.timezone,
        settlementAlgorithm: values.settlementAlgorithm,
        description: ""
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      setFormErrorSummary([await apiErrorMessage(error, "Could not create this event yet. Try again.")]);
    }
  };

  const onInvalidSubmit = () => {
    const nextErrors = Object.entries(errors).map(([, error]) => error?.message).filter(Boolean) as string[];
    if (participants.length === 0) {
      nextErrors.push("Participants are required.");
    }
    setFormErrorSummary(nextErrors);
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={700}>
          Your events
        </Typography>
      </Box>

      <Box sx={{ display: "flex", justifyContent: { xs: "stretch", md: "flex-end" } }}>
        <PrimaryActionButton onClick={openDialog}>Create event</PrimaryActionButton>
      </Box>

      <PageZone title="Filters">
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField
            label="Search events"
            placeholder="Search events"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            fullWidth
          />
          <Select
            size="small"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            sx={{ minWidth: 130 }}
            inputProps={{ "aria-label": "Status filter" }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
          </Select>
          <Select
            size="small"
            value={currencyFilter}
            onChange={(event) => setCurrencyFilter(event.target.value)}
            sx={{ minWidth: 130 }}
            inputProps={{ "aria-label": "Currency filter" }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="USD">USD ($)</MenuItem>
            <MenuItem value="EUR">EUR (EUR)</MenuItem>
          </Select>
        </Stack>
      </PageZone>

      <PageZone title="Primary content">
        <Stack spacing={2}>
          {eventsLoadError ? <Alert severity="error">{eventsLoadError}</Alert> : null}
          {isLoadingEvents ? <Alert severity="info">Loading events...</Alert> : null}
          {!isLoadingEvents && filteredEvents.length === 0 ? (
            <Alert severity="info">No events yet. Create your first event to get started.</Alert>
          ) : (
            filteredEvents.map((event) => (
              <Box
                key={event.id}
                sx={{
                  border: "1px solid #E7D7CC",
                  borderRadius: 2,
                  p: 2
                }}
              >
                <Typography variant="h6">{event.name}</Typography>
                <Typography color="text.secondary">
                  {event.currency} - {event.timezone}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Algorithm: {event.settlementAlgorithm === "min-transfer" ? "Min transfer" : "Pairwise"}
                </Typography>
                <Button component={RouterLink} to={`/app/events/${event.id}`} variant="text" sx={{ mt: 0.5, px: 0 }}>
                  Open event
                </Button>
              </Box>
            ))
          )}
        </Stack>
      </PageZone>

      <PageZone title="Secondary content">
        <Typography color="text.secondary">Recent activity will appear here once your workspace has data.</Typography>
      </PageZone>

      <PageZone title="Feedback states">
        <Typography variant="h6">No archived events</Typography>
        <Typography color="text.secondary" sx={{ mb: 1.5 }}>
          Archived events appear here once you archive an event.
        </Typography>
        <PrimaryActionButton>View active events</PrimaryActionButton>
      </PageZone>

      <Dialog open={isCreateDialogOpen} onClose={closeDialog} fullWidth maxWidth="md" aria-labelledby="create-event-title">
        <DialogTitle id="create-event-title">Create event</DialogTitle>
        <DialogContent dividers>
          <Stack
            component="form"
            id="create-event-form"
            noValidate
            spacing={2}
            onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
            sx={{ pt: 0.5 }}
          >
            {formErrorSummary.length > 0 ? (
              <Alert severity="error" aria-live="assertive">
                We could not save this yet. Review the highlighted fields.
              </Alert>
            ) : null}

            <Controller
              name="eventName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  id="event-name-field"
                  label="Event name"
                  placeholder="Summer Trip 2026"
                  error={Boolean(errors.eventName)}
                  helperText={errors.eventName?.message ?? "How this event appears in your workspace."}
                />
              )}
            />

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <Controller
                name="baseCurrency"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={Boolean(errors.baseCurrency)}>
                    <InputLabel id="event-currency-label">Base currency</InputLabel>
                    <Select {...field} labelId="event-currency-label" label="Base currency">
                      <MenuItem value="EUR">EUR</MenuItem>
                      <MenuItem value="USD">USD</MenuItem>
                    </Select>
                    <FormHelperText>{errors.baseCurrency?.message ?? "All totals are shown in this currency."}</FormHelperText>
                  </FormControl>
                )}
              />

              <Controller
                name="timezone"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={Boolean(errors.timezone)}>
                    <InputLabel id="event-timezone-label">Timezone</InputLabel>
                    <Select {...field} labelId="event-timezone-label" label="Timezone">
                      <MenuItem value="Europe/Paris">Europe/Paris</MenuItem>
                      <MenuItem value="Europe/Lisbon">Europe/Lisbon</MenuItem>
                    </Select>
                    <FormHelperText>{errors.timezone?.message ?? "Used for entry dates and analytics grouping."}</FormHelperText>
                  </FormControl>
                )}
              />
            </Stack>

            <Controller
              name="settlementAlgorithm"
              control={control}
              render={({ field }) => (
                <FormControl error={Boolean(errors.settlementAlgorithm)}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Typography component="label" fontWeight={600}>
                      Default settlement algorithm
                    </Typography>
                  </Stack>
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
                  <FormHelperText>{errors.settlementAlgorithm?.message}</FormHelperText>
                </FormControl>
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  multiline
                  minRows={3}
                  label="Description (optional)"
                  placeholder="A quick context for this event"
                  error={Boolean(errors.description)}
                  helperText={errors.description?.message ?? "Optional context for collaborators."}
                />
              )}
            />

            <Stack spacing={1}>
              <Typography fontWeight={600}>Participants</Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "flex-start" }}>
                <TextField
                  id="participants-field"
                  label="Add person"
                  placeholder="Name"
                  value={participantInput}
                  onChange={(event) => setParticipantInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addParticipant();
                    }
                  }}
                  error={Boolean(participantError)}
                  helperText={participantError ?? "People become available in split forms."}
                  fullWidth
                />
                <Button
                  type="button"
                  variant="outlined"
                  sx={{ height: 56, minHeight: 56, minWidth: 124, whiteSpace: "nowrap", px: 2.5 }}
                  onClick={addParticipant}
                >
                  Add person
                </Button>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {participants.map((person) => (
                  <Chip
                    key={person}
                    label={person}
                    onDelete={() => setParticipants((current) => current.filter((entry) => entry !== person))}
                  />
                ))}
              </Stack>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button type="submit" form="create-event-form" variant="contained" disabled={isSubmitting}>
            Create event
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
