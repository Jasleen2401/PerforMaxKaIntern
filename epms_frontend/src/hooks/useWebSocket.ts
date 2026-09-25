import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import { addNotification } from "../features/notification/notificationSlice";
import type { NotificationResponse } from "../features/notification/notificationTypes";

const WS_URL = import.meta.env.VITE_WS_URL || "/ws";

export const useWebSocket = () => {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.accessToken);
  const user = useAppSelector((state) => state.auth.user);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!token || !user) {
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
      return;
    }

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: () => {},
      reconnectDelay: 30000,
      heartbeatIncoming: 0,
      heartbeatOutgoing: 0,
      onWebSocketError: () => {},
      onStompError: () => {},
    });

    client.onConnect = (frame) => {
      console.log("Connected to STOMP", frame);

      // Subscribe to private notifications for the user
      // Backend uses config.setUserDestinationPrefix("/user")
      // And messagingTemplate.convertAndSendToUser(recipient.getEmail(), "/queue/notifications", ...)
      client.subscribe(`/user/queue/notifications`, (message) => {
        try {
          const notification: NotificationResponse = JSON.parse(message.body);
          dispatch(addNotification(notification));
          // You could also trigger a browser notification or toast here
        } catch (error) {
          console.error("Error parsing notification message", error);
        }
      });

      // Subscribe to global notifications
      client.subscribe("/topic/notifications", (message) => {
        try {
          const notification: NotificationResponse = JSON.parse(message.body);
          dispatch(addNotification(notification));
        } catch (error) {
          console.error("Error parsing broadcast message", error);
        }
      });
    };

    client.onStompError = (frame) => {
      console.error("STOMP error", frame.headers["message"]);
      console.error("Details", frame.body);
    };

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    };
  }, [token, user, dispatch]);

  return clientRef.current;
};
