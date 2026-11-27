"use client";

import { useSyncExternalStore } from "react";
import { AUCTION_DOMAIN } from "@/lib/auction/domains";

const subscribe = () => () => {};
const getSnapshot = () => window.location.hostname.toLowerCase() !== AUCTION_DOMAIN;
const getServerSnapshot = () => false;

export function useMainSite() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
