import DashboardRouter from "../pages/DashboardRouter";
import ProfilePage from "../pages/ProfilePage";
import EditProfilePage from "../pages/EditProfilePage";
import NotificationsPage from "../pages/NotificationsPage";
import InternModule from "../modules/intern/InternModule";
import ChangePasswordPage from "../pages/ChangePasswordPage";

export const generalRoutes = [
  { path: "/dashboard", element: <DashboardRouter /> },
  { path: "/intern", element: <InternModule /> },
  { path: "/profile", element: <ProfilePage /> },
  { path: "/profile/edit", element: <EditProfilePage /> },
  { path: "/notifications", element: <NotificationsPage /> },
  { path: "/change-password", element: <ChangePasswordPage /> },
];

