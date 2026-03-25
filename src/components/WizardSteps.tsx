import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import LooksOneRoundedIcon from "@mui/icons-material/LooksOneRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { closestCenter, DndContext, type DragEndEvent, type DndContextProps } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Alert,
  alpha,
  Box,
  Button,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from "@mui/material";
import { memo, type ReactNode } from "react";
import type { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import {
  computeItemPreview,
  computeSettlement,
  formatMoney,
  formatMoneyTrailingSymbol,
  ITEM_AMOUNT_MAX_CENTS,
  ITEM_AMOUNT_TOO_HIGH_MESSAGE,
  ITEM_NAME_MAX_LENGTH,
  parseMoneyToCents,
  PARTICIPANT_NAME_MAX_LENGTH,
  type AllocationFormValue,
  type ItemFormValue,
  type ParticipantFormValue,
  type SplitFormValues,
  type SplitMode
} from "../domain/splitter";

const SURFACE_RADIUS = 18;
const INNER_RADIUS = 14;

type ReceiptImportStatus =
  | { state: "idle" }
  | { state: "processing"; fileName: string }
  | { state: "success"; fileName: string; importedCount: number; warnings: string[] }
  | { state: "error"; message: string };

function isEqualSplitAcrossEveryone(item: SplitFormValues["items"][number], participantCount: number) {
  if (participantCount <= 0 || item.allocations.length !== participantCount) {
    return false;
  }

  if (item.splitMode === "even") {
    return item.allocations.every((allocation) => allocation.evenIncluded);
  }

  if (item.splitMode === "shares") {
    return item.allocations.every((allocation) => Math.abs(Number(allocation.shares || 0) - 1) < 0.001);
  }

  const expectedPercent = 100 / participantCount;
  return item.allocations.every(
    (allocation) => Math.abs(Number(allocation.percent || 0) - expectedPercent) < 0.001
  );
}

function SortableCard(props: {
  id: string;
  children: ReactNode;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableMoveUp: boolean;
  disableMoveDown: boolean;
  showMoveControls?: boolean;
  tone?: "default" | "composer";
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.id
  });

  return (
    <Card
      ref={setNodeRef}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        overflow: "visible",
        borderRadius: `${SURFACE_RADIUS}px`,
        borderColor:
          props.tone === "composer" ? alpha("#0F766E", 0.18) : alpha("#1D1D1F", 0.08),
        borderStyle: props.tone === "composer" ? "dashed" : "solid",
        bgcolor: props.tone === "composer" ? alpha("#0F766E", 0.025) : "background.paper",
        boxShadow: "0 14px 34px rgba(31, 23, 15, 0.05)"
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={1.5}
          sx={{ display: props.showMoveControls === false ? "none" : "flex" }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              {...attributes}
              {...listeners}
              aria-label="Drag to reorder item"
              size="small"
              sx={{
                bgcolor: alpha("#EF5B3C", 0.08),
                color: "text.secondary",
                "&:hover": { bgcolor: alpha("#EF5B3C", 0.14) }
              }}
            >
              <DragIndicatorRoundedIcon fontSize="small" />
            </IconButton>
            {props.showMoveControls !== false && (
              <Stack direction="row" spacing={0.5}>
                <IconButton
                  onClick={props.onMoveUp}
                  disabled={props.disableMoveUp}
                  size="small"
                  aria-label="Move item up"
                >
                  <KeyboardArrowUpRoundedIcon fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={props.onMoveDown}
                  disabled={props.disableMoveDown}
                  size="small"
                  aria-label="Move item down"
                >
                  <KeyboardArrowDownRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            )}
          </Stack>
        </Stack>
        <Box sx={{ mt: props.showMoveControls === false ? 0 : 2 }}>{props.children}</Box>
      </CardContent>
    </Card>
  );
}

function SortableInlineHandle({ id }: { id: string }) {
  const { attributes, listeners } = useSortable({ id });

  return (
    <IconButton
      {...attributes}
      {...listeners}
      aria-label="Drag to reorder item"
      size="small"
      sx={{
        bgcolor: alpha("#EF5B3C", 0.08),
        color: "text.secondary",
        "&:hover": { bgcolor: alpha("#EF5B3C", 0.14) }
      }}
    >
      <DragIndicatorRoundedIcon fontSize="small" />
    </IconButton>
  );
}

type StepParticipantsProps = {
  participants: ParticipantFormValue[];
  payerParticipantId: string;
  participantInput: string;
  canAddParticipant: boolean;
  errors: FieldErrors<SplitFormValues>;
  setParticipantInput: (value: string) => void;
  addParticipant: () => void;
  removeParticipant: (index: number) => void;
  setPayerParticipantId: (participantId: string) => void;
  handleNext: () => void;
  register: UseFormRegister<SplitFormValues>;
};

export const StepParticipants = memo(function StepParticipants({
  participants,
  payerParticipantId,
  participantInput,
  canAddParticipant,
  errors,
  setParticipantInput,
  addParticipant,
  removeParticipant,
  setPayerParticipantId,
  handleNext,
  register
}: StepParticipantsProps) {
  return (
    <Stack spacing={3}>
      {participants.length < 2 && <Alert severity="info">Add at least two people to continue.</Alert>}

      {errors.participants?.message && <Alert severity="error">{errors.participants.message}</Alert>}

      <Grid container spacing={2}>
        {participants.map((participant, index) => {
          const participantError = errors.participants?.[index]?.name?.message;

          return (
            <Grid size={{ xs: 12, md: 6 }} key={participant.id}>
              <Card
                sx={{
                  borderRadius: `${SURFACE_RADIUS}px`,
                  borderColor:
                    payerParticipantId === participant.id ? "primary.main" : alpha("#1D1D1F", 0.08),
                  borderStyle: "solid",
                  borderWidth: 1,
                  bgcolor: payerParticipantId === participant.id ? alpha("#EF5B3C", 0.04) : "background.paper"
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 2.25 } }}>
                  <Stack spacing={1.25}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                      <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
                        <Chip icon={<PersonRoundedIcon />} label={`Person ${index + 1}`} variant="outlined" />
                        {payerParticipantId === participant.id ? (
                          <Chip icon={<PaidRoundedIcon />} label="Payer" color="primary" sx={{ fontWeight: 700 }} />
                        ) : (
                          <Chip
                            label="🏦 Set as payer"
                            variant="outlined"
                            clickable
                            onClick={() => setPayerParticipantId(participant.id)}
                            sx={{ fontWeight: 700 }}
                          />
                        )}
                      </Stack>
                    </Stack>
                    <TextField
                      label="Name"
                      fullWidth
                      {...register(`participants.${index}.name` as const)}
                      error={Boolean(participantError)}
                      helperText={participantError}
                      inputProps={{ maxLength: PARTICIPANT_NAME_MAX_LENGTH }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={`Remove ${participant.name || `participant ${index + 1}`}`}
                              onClick={() => removeParticipant(index)}
                              type="button"
                              size="small"
                              edge="end"
                            >
                              <DeleteOutlineRoundedIcon />
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: `${SURFACE_RADIUS}px`,
              borderColor: alpha("#0F766E", 0.18),
              borderStyle: "dashed",
              borderWidth: 1,
              bgcolor: alpha("#0F766E", 0.025),
              boxShadow: "0 14px 34px rgba(31, 23, 15, 0.05)"
            }}
          >
            <CardContent sx={{ p: { xs: 2, md: 2.25 } }}>
              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Chip icon={<AddRoundedIcon />} label="New participant" variant="outlined" />
                </Stack>
                <TextField
                  label="Name"
                  placeholder="Participant name"
                  name="participant-draft-name"
                  value={participantInput}
                  onChange={(event) => setParticipantInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (!canAddParticipant) {
                        handleNext();
                        return;
                      }
                      addParticipant();
                    }
                  }}
                  fullWidth
                  inputProps={{ maxLength: PARTICIPANT_NAME_MAX_LENGTH }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="Add person"
                          onClick={addParticipant}
                          disabled={!canAddParticipant}
                          type="button"
                          edge="end"
                          size="small"
                          color="primary"
                          sx={{
                            bgcolor: canAddParticipant ? alpha("#EF5B3C", 0.08) : "transparent",
                            "&:hover": {
                              bgcolor: canAddParticipant ? alpha("#EF5B3C", 0.14) : "transparent"
                            }
                          }}
                        >
                          <AddRoundedIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {errors.payerParticipantId?.message && <Alert severity="error">{errors.payerParticipantId.message}</Alert>}
    </Stack>
  );
});

type StepItemsProps = {
  items: ItemFormValue[];
  errors: FieldErrors<SplitFormValues>;
  currency: string;
  receiptImportStatus: ReceiptImportStatus;
  sensors: DndContextProps["sensors"];
  register: UseFormRegister<SplitFormValues>;
  setImportDialogOpen: (open: boolean) => void;
  resetItems: () => void;
  handleItemDragEnd: (event: DragEndEvent) => void;
  reorderItems: (fromIndex: number, toIndex: number) => void;
  handleItemSubmitFromEnter: (index: number) => void;
  removeItem: (index: number) => void;
};

export const StepItems = memo(function StepItems({
  items,
  errors,
  currency,
  receiptImportStatus,
  sensors,
  register,
  setImportDialogOpen,
  resetItems,
  handleItemDragEnd,
  reorderItems,
  handleItemSubmitFromEnter,
  removeItem
}: StepItemsProps) {
  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="subtitle1">Receipt items</Typography>
          <Typography variant="body2" color="text.secondary">
            Type directly below, or import a receipt.
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} useFlexGap>
          <Button
            variant="outlined"
            startIcon={<UploadFileRoundedIcon />}
            onClick={() => setImportDialogOpen(true)}
            disabled={receiptImportStatus.state === "processing"}
            sx={{ alignSelf: { xs: "stretch", sm: "center" } }}
          >
            {receiptImportStatus.state === "processing" ? "Importing..." : "Import"}
          </Button>
          <Button
            variant="text"
            color="inherit"
            startIcon={<RestartAltRoundedIcon />}
            onClick={resetItems}
            disabled={items.length === 0 || receiptImportStatus.state === "processing"}
            sx={{ alignSelf: { xs: "stretch", sm: "center" } }}
          >
            Reset items
          </Button>
        </Stack>
      </Stack>

      {receiptImportStatus.state === "processing" && (
        <Alert severity="info">Reading {receiptImportStatus.fileName} and extracting receipt lines.</Alert>
      )}

      {receiptImportStatus.state === "success" && (
        <Alert severity="success">
          Imported {receiptImportStatus.importedCount} items from {receiptImportStatus.fileName}. Review and edit
          anything that needs cleanup.
        </Alert>
      )}

      {receiptImportStatus.state === "error" && <Alert severity="error">{receiptImportStatus.message}</Alert>}

      {receiptImportStatus.state === "success" &&
        receiptImportStatus.warnings.map((warning, index) => (
          <Alert severity="warning" key={`${index}-${warning}`}>
            {warning}
          </Alert>
        ))}

      {errors.items?.message && <Alert severity="error">{errors.items.message}</Alert>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleItemDragEnd}
      >
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <Stack spacing={2}>
            {items.map((item, index) => {
              const parsedItemAmount = parseMoneyToCents(item.price);
              const hasPriceInput = item.price.trim().length > 0;
              const itemNameMissingWithPrice = hasPriceInput && !item.name.trim();
              const itemNameTooLong =
                item.name.trim().length > ITEM_NAME_MAX_LENGTH
                  ? `Keep item names under ${ITEM_NAME_MAX_LENGTH} characters.`
                  : undefined;
              const itemNameError =
                itemNameTooLong ??
                (itemNameMissingWithPrice ? "This item needs a name." : undefined) ??
                errors.items?.[index]?.name?.message;
              const itemPriceFormatError =
                hasPriceInput && parsedItemAmount === null
                  ? "Use numbers only, with up to 2 decimals, for example 3.49."
                  : undefined;
              const itemPriceZeroError =
                hasPriceInput && parsedItemAmount === 0 ? "Amount must be different from zero." : undefined;
              const itemPriceError = itemPriceFormatError ?? itemPriceZeroError ?? errors.items?.[index]?.price?.message;
              const itemPriceTooHigh =
                parsedItemAmount !== null && Math.abs(parsedItemAmount) > ITEM_AMOUNT_MAX_CENTS;

              return (
                <SortableCard
                  key={item.id}
                  id={item.id}
                  onMoveUp={() => reorderItems(index, index - 1)}
                  onMoveDown={() => reorderItems(index, index + 1)}
                  disableMoveUp={index === 0}
                  disableMoveDown={index === items.length - 1}
                  showMoveControls={false}
                  tone={!item.name.trim() && !item.price.trim() ? "composer" : "default"}
                >
                  <Stack spacing={1.25}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ display: { xs: "flex", md: "none" } }}
                    >
                      <SortableInlineHandle id={item.id} />
                      <IconButton
                        aria-label={`Delete ${item.name || `item ${index + 1}`}`}
                        onClick={() => removeItem(index)}
                        type="button"
                      >
                        <DeleteOutlineRoundedIcon />
                      </IconButton>
                    </Stack>
                    <Grid container spacing={1.5} alignItems="flex-start">
                    <Grid size={{ xs: 12, md: "grow" }} sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Box sx={{ pt: 1, display: { xs: "none", md: "block" } }}>
                          <SortableInlineHandle id={item.id} />
                        </Box>
                        <TextField
                          label="Item name"
                          placeholder="Tomatoes"
                          fullWidth
                          {...register(`items.${index}.name` as const)}
                          error={Boolean(itemNameError)}
                          helperText={itemNameError}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              handleItemSubmitFromEnter(index);
                            }
                          }}
                          inputProps={{ maxLength: ITEM_NAME_MAX_LENGTH }}
                          sx={{
                            "& .MuiInputAdornment-root": {
                              color: "text.secondary",
                              fontWeight: 700
                            },
                            "& .MuiInputBase-input": {
                              fontWeight: 700
                            }
                          }}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">#{index + 1}</InputAdornment>
                          }}
                        />
                      </Stack>
                    </Grid>
                    <Grid size={{ xs: 12, md: "auto" }} sx={{ minWidth: { md: 260 } }}>
                      <TextField
                        label="Price"
                        placeholder="3.49"
                        fullWidth
                        {...register(`items.${index}.price` as const)}
                        error={Boolean(itemPriceError) || itemPriceTooHigh}
                        helperText={itemPriceTooHigh ? `${ITEM_AMOUNT_TOO_HIGH_MESSAGE} ${currency}.` : itemPriceError}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">{currency}</InputAdornment>
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleItemSubmitFromEnter(index);
                          }
                        }}
                        inputProps={{
                          inputMode: "decimal",
                          maxLength: String(ITEM_AMOUNT_MAX_CENTS / 100).length + 3
                        }}
                        sx={{
                          "& .MuiInputBase-input": {
                            fontWeight: 700
                          }
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: "auto" }}>
                      <Stack direction="row" justifyContent={{ xs: "flex-end", md: "flex-start" }} sx={{ mt: { md: 1 } }}>
                        <IconButton
                          aria-label={`Delete ${item.name || `item ${index + 1}`}`}
                          onClick={() => removeItem(index)}
                          type="button"
                          sx={{ display: { xs: "none", md: "inline-flex" } }}
                        >
                          <DeleteOutlineRoundedIcon />
                        </IconButton>
                      </Stack>
                    </Grid>
                    </Grid>
                  </Stack>
                </SortableCard>
              );
            })}
          </Stack>
        </SortableContext>
      </DndContext>
    </Stack>
  );
});

type StepSplitProps = {
  visibleItems: Array<{ item: ItemFormValue; index: number }>;
  deferredValues: SplitFormValues;
  participants: ParticipantFormValue[];
  errors: FieldErrors<SplitFormValues>;
  currency: string;
  setValue: UseFormSetValue<SplitFormValues>;
  toggleEvenAllocation: (itemIndex: number, allocationIndex: number) => void;
  updateShareValue: (itemIndex: number, allocationIndex: number, nextValue: string) => void;
  nudgeShareValue: (itemIndex: number, allocationIndex: number, delta: 1 | -1) => void;
  updatePercentValue: (itemIndex: number, participantId: string, nextValue: string) => void;
  nudgePercentValue: (itemIndex: number, participantId: string, delta: 1 | -1) => void;
  setExclusiveAllocation: (itemIndex: number, allocationIndex: number, participantId: string) => void;
  zeroShareValue: (itemIndex: number, allocationIndex: number) => void;
  zeroPercentValue: (itemIndex: number, participantId: string) => void;
  resetEvenValues: (itemIndex: number) => void;
  resetShareValues: (itemIndex: number) => void;
  resetPercentValues: (itemIndex: number) => void;
};

export const StepSplit = memo(function StepSplit({
  visibleItems,
  deferredValues,
  participants,
  errors,
  currency,
  setValue,
  toggleEvenAllocation,
  updateShareValue,
  nudgeShareValue,
  updatePercentValue,
  nudgePercentValue,
  setExclusiveAllocation,
  zeroShareValue,
  zeroPercentValue,
  resetEvenValues,
  resetShareValues,
  resetPercentValues
}: StepSplitProps) {
  return (
    <Stack spacing={2.25}>
      <Alert severity="info">These amounts are a preview. Final cents are settled in Balances.</Alert>
      <Stack spacing={1.5}>
        {visibleItems.map(({ item, index: itemIndex }) => {
          const deferredItem = deferredValues.items.find((entry) => entry.id === item.id) ?? item;
          const itemPreview = computeItemPreview(
            deferredItem,
            deferredValues.participants,
            deferredValues.payerParticipantId,
            deferredValues.currency
          );
          const previewPeople = itemPreview.ok ? itemPreview.data.people : [];
          const allocationError =
            typeof errors.items?.[itemIndex]?.allocations?.message === "string"
              ? errors.items[itemIndex]?.allocations?.message
              : undefined;
          const canResetItem = !isEqualSplitAcrossEveryone(item, participants.length);

          return (
            <Card
              key={item.id}
              variant="outlined"
              sx={{
                overflow: "visible",
                borderRadius: `${SURFACE_RADIUS}px`,
                borderColor: alpha("#1D1D1F", 0.08),
                bgcolor: "background.paper",
                boxShadow: "0 14px 34px rgba(31, 23, 15, 0.05)"
              }}
            >
              <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                <Stack spacing={2}>
                  <Box
                    sx={{
                      px: { xs: 1.35, md: 1.6 },
                      py: { xs: 1.25, md: 1.4 },
                      borderRadius: `${INNER_RADIUS}px`,
                      bgcolor: alpha("#1D1D1F", 0.025),
                      border: "1px solid",
                      borderColor: alpha("#1D1D1F", 0.06)
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                        alignItems: { xs: "stretch", sm: "center" },
                        gap: 1.5
                      }}
                    >
                      <Stack
                        sx={{
                          minWidth: 0,
                          justifyContent: "center",
                          minHeight: 32,
                          flex: { xs: "1 1 100%", sm: "1 1 150px", lg: "1 1 240px" }
                        }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          spacing={1}
                          sx={{ minHeight: 32, width: "100%" }}
                        >
                          <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap" sx={{ minWidth: 0, minHeight: 32 }}>
                            <Typography
                              variant="h4"
                              fontWeight={800}
                              sx={{ display: "flex", alignItems: "center", lineHeight: 1 }}
                            >
                              {item.name || `Item ${itemIndex + 1}`}
                            </Typography>
                            <Chip
                              size="small"
                              label={
                                item.price
                                  ? formatMoneyTrailingSymbol(parseMoneyToCents(item.price) ?? 0, currency)
                                  : "Enter an amount in Step 2"
                              }
                              sx={{
                                fontWeight: 700,
                                alignSelf: "center",
                                height: 32,
                                "& .MuiChip-label": {
                                  display: "flex",
                                  alignItems: "center",
                                  height: "100%",
                                  px: 1.15
                                }
                              }}
                            />
                          </Stack>
                          <Button
                            size="small"
                            variant="text"
                            color="inherit"
                            startIcon={<RestartAltRoundedIcon />}
                            onClick={() => {
                              if (item.splitMode === "even") {
                                resetEvenValues(itemIndex);
                              }
                              if (item.splitMode === "shares") {
                                resetShareValues(itemIndex);
                              }
                              if (item.splitMode === "percent") {
                                resetPercentValues(itemIndex);
                              }
                            }}
                            sx={{
                              display: { xs: "inline-flex", sm: "none" },
                              whiteSpace: "nowrap",
                              flexShrink: 0
                            }}
                            disabled={!canResetItem}
                          >
                            Reset item
                          </Button>
                        </Stack>
                      </Stack>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: { xs: "column", sm: "row" },
                          alignItems: { xs: "stretch", sm: "center" },
                          gap: { xs: 1, sm: 0.75 },
                          width: { xs: "100%", sm: "auto" },
                          flex: { xs: "1 1 100%", sm: "0 1 auto" }
                        }}
                      >
                        <Button
                          size="small"
                          variant="text"
                          color="inherit"
                          startIcon={<RestartAltRoundedIcon />}
                          onClick={() => {
                            if (item.splitMode === "even") {
                              resetEvenValues(itemIndex);
                            }
                            if (item.splitMode === "shares") {
                              resetShareValues(itemIndex);
                            }
                            if (item.splitMode === "percent") {
                              resetPercentValues(itemIndex);
                            }
                          }}
                          sx={{
                            display: { xs: "none", sm: "inline-flex" },
                            order: { xs: 1, sm: 0 },
                            alignSelf: { xs: "flex-start", sm: "center" },
                            whiteSpace: "nowrap"
                          }}
                          disabled={!canResetItem}
                        >
                          Reset item
                        </Button>
                        <ToggleButtonGroup
                          exclusive
                          value={item.splitMode}
                          onChange={(_, nextMode: SplitMode | null) => {
                            if (nextMode) {
                              setValue(`items.${itemIndex}.splitMode`, nextMode);
                            }
                          }}
                          size="small"
                          color="primary"
                          sx={{
                            alignSelf: { xs: "stretch", sm: "center" },
                            order: { xs: 0, sm: 1 },
                            width: { xs: "100%", sm: "auto" },
                            maxWidth: { xs: "100%", sm: 330, lg: "none" },
                            "& .MuiToggleButton-root": {
                              minHeight: 32,
                              minWidth: { xs: 0, sm: 60, lg: 82 },
                              px: { xs: 1.25, sm: 1, lg: 1.5 },
                              textTransform: "none",
                              fontWeight: 700,
                              flex: { xs: 1, sm: "0 0 auto" }
                            }
                          }}
                        >
                          <ToggleButton value="even">Even</ToggleButton>
                          <ToggleButton value="shares">Shares</ToggleButton>
                          <ToggleButton value="percent">Percent</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    </Box>
                  </Box>

                  <Grid container spacing={1.25}>
                    {participants.map((participant, allocationIndex) => {
                      const allocation = item.allocations[allocationIndex] as AllocationFormValue | undefined;
                      const previewPerson = previewPeople.find((person) => person.participantId === participant.id);

                      return (
                        <Grid size={{ xs: 12, md: 4 }} key={participant.id}>
                          <Box
                            sx={{
                              height: "100%",
                              borderRadius: `${INNER_RADIUS}px`,
                              border: "1px solid",
                              borderColor: alpha("#1D1D1F", 0.07),
                              bgcolor: alpha("#FFFFFF", 0.78)
                            }}
                          >
                            <Box
                              sx={{
                                px: 1.4,
                                py: 1.2,
                                height: "100%",
                                display: "grid",
                                gridTemplateRows: "auto 1fr",
                                rowGap: 0.6
                              }}
                            >
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Typography fontWeight={800} fontSize="0.98rem">
                                  {participant.name}
                                </Typography>
                                <Typography fontWeight={800} fontSize="0.98rem" color="text.primary">
                                  {formatMoneyTrailingSymbol(previewPerson?.consumedCents ?? 0, currency)}
                                </Typography>
                              </Stack>

                              <Box sx={{ minHeight: 52, display: "flex", alignItems: "center", pt: 0.35 }}>
                                {item.splitMode === "even" && allocation && (
                                  <ButtonBase
                                    onClick={() => toggleEvenAllocation(itemIndex, allocationIndex)}
                                    sx={{
                                      width: "100%",
                                      height: 48,
                                      justifyContent: "space-between",
                                      gap: 1,
                                      borderRadius: `${INNER_RADIUS}px`,
                                      px: 1.25,
                                      border: "1px solid",
                                      borderColor: allocation.evenIncluded
                                        ? alpha("#EF5B3C", 0.5)
                                        : alpha("#1D1D1F", 0.16),
                                      bgcolor: allocation.evenIncluded
                                        ? alpha("#EF5B3C", 0.1)
                                        : alpha("#1D1D1F", 0.03),
                                      color: "text.primary",
                                      fontSize: "0.9rem",
                                      fontWeight: 700
                                    }}
                                  >
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      {allocation.evenIncluded ? (
                                        <CheckCircleRoundedIcon fontSize="small" color="primary" />
                                      ) : (
                                        <CloseRoundedIcon fontSize="small" />
                                      )}
                                      <Typography fontWeight={700}>
                                        {allocation.evenIncluded ? "Included" : "Excluded"}
                                      </Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={0.25} alignItems="center">
                                      <Divider orientation="vertical" flexItem sx={{ mx: 0.25, borderColor: alpha("#1D1D1F", 0.18) }} />
                                        <Tooltip title="Only this person" arrow enterDelay={200}>
                                          <IconButton
                                            aria-label={`Only ${participant.name} for this item`}
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              setExclusiveAllocation(itemIndex, allocationIndex, participant.id);
                                            }}
                                            size="small"
                                            sx={{ color: "text.secondary" }}
                                          >
                                            <LooksOneRoundedIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      </Stack>
                                    </ButtonBase>
                                  )}

                                {item.splitMode === "shares" && allocation && (
                                  <TextField
                                    label="Share units"
                                    fullWidth
                                    size="small"
                                    type="number"
                                    value={allocation.shares}
                                    onChange={(event) => updateShareValue(itemIndex, allocationIndex, event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === "ArrowUp") {
                                        event.preventDefault();
                                        nudgeShareValue(itemIndex, allocationIndex, 1);
                                      }
                                      if (event.key === "ArrowDown") {
                                        event.preventDefault();
                                        nudgeShareValue(itemIndex, allocationIndex, -1);
                                      }
                                    }}
                                    inputProps={{ min: 0, step: 1 }}
                                    InputProps={{
                                      endAdornment: (
                                        <InputAdornment position="end">
                                          <Stack direction="row" spacing={0.25} alignItems="center">
                                            <Divider orientation="vertical" flexItem sx={{ mx: 0.25, borderColor: alpha("#1D1D1F", 0.12) }} />
                                              <Tooltip title="Only this person" arrow enterDelay={200}>
                                                <IconButton
                                                  aria-label={`Only ${participant.name} for this item`}
                                                  onClick={() =>
                                                    setExclusiveAllocation(itemIndex, allocationIndex, participant.id)
                                                  }
                                                  edge="end"
                                                  size="small"
                                                  sx={{ color: "text.secondary" }}
                                                >
                                                  <LooksOneRoundedIcon fontSize="small" />
                                                </IconButton>
                                              </Tooltip>
                                              <Tooltip title="Exclude from split" arrow enterDelay={200}>
                                                <IconButton
                                                  aria-label={`Exclude ${participant.name} from this item`}
                                                  onClick={() => zeroShareValue(itemIndex, allocationIndex)}
                                                  edge="end"
                                                  size="small"
                                                  sx={{ color: "text.secondary" }}
                                                >
                                                  <CloseRoundedIcon fontSize="small" />
                                                </IconButton>
                                              </Tooltip>
                                            </Stack>
                                          </InputAdornment>
                                        )
                                    }}
                                    sx={{ width: "100%", "& .MuiInputBase-root": { height: 48 } }}
                                  />
                                )}

                                {item.splitMode === "percent" && allocation && (
                                  <TextField
                                    label="Percent"
                                    fullWidth
                                    size="small"
                                    type="number"
                                    value={allocation.percent}
                                    onChange={(event) => updatePercentValue(itemIndex, participant.id, event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === "ArrowUp") {
                                        event.preventDefault();
                                        nudgePercentValue(itemIndex, participant.id, 1);
                                      }
                                      if (event.key === "ArrowDown") {
                                        event.preventDefault();
                                        nudgePercentValue(itemIndex, participant.id, -1);
                                      }
                                    }}
                                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                                    InputProps={{
                                      startAdornment: <InputAdornment position="start">%</InputAdornment>,
                                      endAdornment: (
                                        <InputAdornment position="end">
                                          <Stack direction="row" spacing={0.25} alignItems="center">
                                            <Divider orientation="vertical" flexItem sx={{ mx: 0.25, borderColor: alpha("#1D1D1F", 0.12) }} />
                                              <Tooltip title="Only this person" arrow enterDelay={200}>
                                                <IconButton
                                                  aria-label={`Only ${participant.name} for this item`}
                                                  onClick={() =>
                                                    setExclusiveAllocation(itemIndex, allocationIndex, participant.id)
                                                  }
                                                  edge="end"
                                                  size="small"
                                                  sx={{ color: "text.secondary" }}
                                                >
                                                  <LooksOneRoundedIcon fontSize="small" />
                                                </IconButton>
                                              </Tooltip>
                                              <Tooltip title="Exclude from split" arrow enterDelay={200}>
                                                <IconButton
                                                  aria-label={`Exclude ${participant.name} from this item`}
                                                  onClick={() => zeroPercentValue(itemIndex, participant.id)}
                                                  edge="end"
                                                  size="small"
                                                  sx={{ color: "text.secondary" }}
                                                >
                                                  <CloseRoundedIcon fontSize="small" />
                                                </IconButton>
                                              </Tooltip>
                                            </Stack>
                                          </InputAdornment>
                                        )
                                    }}
                                    sx={{ width: "100%", "& .MuiInputBase-root": { height: 48 } }}
                                  />
                                )}
                              </Box>
                            </Box>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>

                  {allocationError && <Alert severity="error">{allocationError}</Alert>}
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
});

type StepBalancesProps = {
  settlement: Extract<ReturnType<typeof computeSettlement>, { ok: true }>;
  copySummary: () => void;
  exportSummaryPdf: () => void;
  exportPdfPending: boolean;
};

export const StepBalances = memo(function StepBalances({
  settlement,
  copySummary,
  exportSummaryPdf,
  exportPdfPending
}: StepBalancesProps) {
  const payer = settlement.data.people.find((person) => person.isPayer);
  const payees = [...settlement.data.people]
    .filter((person) => !person.isPayer)
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ md: "center" }}
      >
        <Box>
          <Typography variant="h2">Final balances</Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
          <Button variant="contained" onClick={copySummary}>
            Copy summary
          </Button>
          <Button variant="outlined" onClick={exportSummaryPdf} disabled={exportPdfPending}>
            {exportPdfPending ? "Exporting PDF..." : "Export to PDF"}
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        {payer && (
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card
              variant="outlined"
              sx={{
                height: "100%",
                borderRadius: `${SURFACE_RADIUS}px`,
                borderColor: alpha("#EF5B3C", 0.18),
                bgcolor: alpha("#FFFFFF", 0.82)
              }}
            >
              <CardContent sx={{ p: { xs: 2.25, md: 2.5 } }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Payer
                    </Typography>
                    <Typography variant="h3">{payer.name}</Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: `${INNER_RADIUS}px`,
                      bgcolor: alpha("#EF5B3C", 0.08),
                      border: "1px solid",
                      borderColor: alpha("#EF5B3C", 0.16)
                    }}
                  >
                    <Typography color="text.secondary">Collect</Typography>
                    <Typography variant="h2" color="primary.main">
                      {formatMoney(payer.netCents, settlement.data.currency)}
                    </Typography>
                  </Box>
                  <Grid container spacing={1.25}>
                    {[
                      { label: "Paid", value: formatMoney(payer.paidCents, settlement.data.currency) },
                      { label: "Consumed", value: formatMoney(payer.consumedCents, settlement.data.currency) }
                    ].map((metric) => (
                      <Grid size={{ xs: 12, sm: 6 }} key={metric.label}>
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: `${INNER_RADIUS}px`,
                            bgcolor: alpha("#1D1D1F", 0.03)
                          }}
                        >
                          <Typography color="text.secondary">{metric.label}</Typography>
                          <Typography variant="h5">{metric.value}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid size={{ xs: 12, lg: payer ? 7 : 12 }}>
          <Card
            variant="outlined"
            sx={{
              height: "100%",
              borderRadius: `${SURFACE_RADIUS}px`,
              borderColor: alpha("#1D1D1F", 0.08),
              bgcolor: alpha("#FFFFFF", 0.82)
            }}
          >
            <CardContent sx={{ p: { xs: 2.25, md: 2.5 } }}>
              <Stack spacing={1.5}>
                <Typography variant="h3">Who owes</Typography>
                {payees.length > 0 ? (
                  <Stack spacing={1}>
                    {payees.map((person) => (
                      <Box
                        key={person.participantId}
                        sx={{
                          px: 1.75,
                          py: 1.5,
                          borderRadius: `${INNER_RADIUS}px`,
                          bgcolor: alpha("#1D1D1F", 0.03),
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 2
                        }}
                      >
                        <Typography variant="subtitle1" fontWeight={800}>
                          {person.name}
                        </Typography>
                        <Typography variant="h4" color="primary.main" fontWeight={900}>
                          {formatMoney(Math.abs(person.netCents), settlement.data.currency)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography color="text.secondary">
                    Everyone is already balanced. No reimbursements are needed.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
});
