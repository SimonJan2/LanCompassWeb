import type { APIRoute } from "astro";
import { iconPng } from "../lib/icons";

export const GET: APIRoute = () => iconPng(192);
