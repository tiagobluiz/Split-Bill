import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import {
  AppBar,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { useState } from "react";
import { Link as RouterLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const DRAWER_WIDTH = 272;
const RAIL_WIDTH = 80;

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/app/dashboard", icon: <DashboardOutlinedIcon /> },
  { label: "Settings", to: "/app/settings", icon: <SettingsOutlinedIcon /> }
];

function resolveNavValue(pathname: string): string {
  const item = NAV_ITEMS.find((entry) => pathname.startsWith(entry.to));
  return item?.to ?? "/app/dashboard";
}

export function AppShell() {
  const { session, signOut } = useAuth();
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.down("lg"));
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const navWidth = isMobile ? 0 : isTablet ? RAIL_WIDTH : DRAWER_WIDTH;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {!isMobile ? (
        <Drawer
          variant="permanent"
          PaperProps={{
            sx: {
              width: navWidth,
              boxSizing: "border-box",
              borderRight: "1px solid #E7D7CC",
              bgcolor: "background.paper"
            }
          }}
        >
          <Box sx={{ p: 3, pb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              Split-Bill
            </Typography>
          </Box>
          <List sx={{ px: 1 }}>
            {NAV_ITEMS.map((item) => {
              const selected = location.pathname.startsWith(item.to);
              return (
                <ListItemButton
                  key={item.to}
                  component={RouterLink}
                  to={item.to}
                  selected={selected}
                  sx={{
                    my: 0.5,
                    borderRadius: 2,
                    justifyContent: isTablet ? "center" : "flex-start",
                    "&.Mui-selected": {
                      bgcolor: "#FFF1E7"
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: isTablet ? 0 : 36 }}>{item.icon}</ListItemIcon>
                  {!isTablet ? <ListItemText primary={item.label} /> : null}
                </ListItemButton>
              );
            })}
          </List>
        </Drawer>
      ) : null}

      <Box sx={{ flexGrow: 1, pl: !isMobile ? `${navWidth}px` : 0 }}>
        <AppBar
          color="inherit"
          elevation={0}
          sx={{
            borderBottom: "1px solid #E7D7CC",
            bgcolor: "background.paper",
            height: isMobile ? 56 : 64,
            justifyContent: "center"
          }}
        >
          <Toolbar sx={{ minHeight: "inherit !important", px: { xs: 2, md: 4 } }}>
            <Typography variant="body2" color="text.secondary">
              Personal
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
              CET (Europe/Paris)
            </Typography>
            <IconButton
              color="inherit"
              aria-label="Account menu"
              onClick={(event) => setMenuAnchor(event.currentTarget)}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}>
                <AccountCircleRoundedIcon fontSize="small" />
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
              <MenuItem disabled>{session?.email}</MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  signOut();
                }}
              >
                <ListItemIcon>
                  <LogoutRoundedIcon fontSize="small" />
                </ListItemIcon>
                Sign out
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            maxWidth: 1280,
            mx: "auto",
            px: { xs: 2, md: 4 },
            pt: { xs: "72px", md: "88px" },
            pb: { xs: 12, md: 4 }
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {isMobile ? (
        <Paper
          sx={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            borderTop: "1px solid #E7D7CC"
          }}
          elevation={3}
        >
          <BottomNavigation showLabels value={resolveNavValue(location.pathname)}>
            {NAV_ITEMS.map((item) => (
              <BottomNavigationAction
                key={item.to}
                label={item.label}
                value={item.to}
                icon={item.icon}
                component={RouterLink}
                to={item.to}
              />
            ))}
          </BottomNavigation>
        </Paper>
      ) : null}
    </Box>
  );
}

export function PageZone({
  title,
  children,
  action
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        p: { xs: 2, md: 2.5 },
        bgcolor: "background.paper",
        borderRadius: 3,
        border: "1px solid #E7D7CC",
        boxShadow: "0 4px 12px rgba(20,18,30,0.10)"
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
        <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}

export function PrimaryActionButton({
  children,
  onClick
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Button variant="contained" sx={{ minHeight: 44 }} onClick={onClick}>
      {children}
    </Button>
  );
}
