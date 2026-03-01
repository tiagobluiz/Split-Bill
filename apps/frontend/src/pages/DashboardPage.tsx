import { Box, Chip, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { PageZone, PrimaryActionButton } from "../layout/AppShell";

const cards = [
  { title: "Italy Vacation", participants: 4, status: "You'll get back", amount: "€34.00" },
  { title: "House Party", participants: 5, status: "You'll send", amount: "€21.75" },
  { title: "Weekend Getaway", participants: 6, status: "All square", amount: "€0.00" },
  { title: "Paris Trip", participants: 3, status: "You'll get back", amount: "€54.60" }
];

export function DashboardPage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={700}>
          Your events
        </Typography>
      </Box>

      <Box sx={{ display: "flex", justifyContent: { xs: "stretch", md: "flex-end" } }}>
        <PrimaryActionButton>Create event</PrimaryActionButton>
      </Box>

      <PageZone title="Filters">
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField label="Search events" placeholder="Search events" fullWidth />
          <Select size="small" defaultValue="all" sx={{ minWidth: 130 }}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </Select>
          <Select size="small" defaultValue="usd" sx={{ minWidth: 130 }}>
            <MenuItem value="usd">USD ($)</MenuItem>
            <MenuItem value="eur">EUR (€)</MenuItem>
          </Select>
        </Stack>
      </PageZone>

      <PageZone title="Primary content">
        <Stack direction={{ xs: "column", md: "row" }} flexWrap="wrap" spacing={2} useFlexGap>
          {cards.map((card) => (
            <Box
              key={card.title}
              sx={{
                border: "1px solid #E7D7CC",
                borderRadius: 2,
                p: 2.5,
                width: { xs: "100%", md: "calc(50% - 8px)" }
              }}
            >
              <Typography variant="h6">{card.title}</Typography>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                {card.participants} participants
              </Typography>
              <Chip
                label={`${card.status} ${card.amount}`}
                color={card.status === "You'll send" ? "warning" : card.status === "All square" ? "default" : "success"}
                variant={card.status === "All square" ? "outlined" : "filled"}
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                Open
              </Typography>
            </Box>
          ))}
        </Stack>
      </PageZone>

      <PageZone title="Secondary content">
        <Typography color="text.secondary">
          Recent activity: Megan added an entry, Chris requested settlement, Sarah added a ticket expense.
        </Typography>
      </PageZone>

      <PageZone title="Feedback states">
        <Typography variant="h6">No archived events</Typography>
        <Typography color="text.secondary" sx={{ mb: 1.5 }}>
          Archived events appear here once you archive an event.
        </Typography>
        <PrimaryActionButton>View active events</PrimaryActionButton>
      </PageZone>
    </Stack>
  );
}
