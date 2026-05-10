import { NextRequest, NextResponse } from "next/server";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

export async function GET(req: NextRequest) {
  const hasApiKey = Boolean(process.env.API_FOOTBALL_KEY);

  if (!req.nextUrl.searchParams.has("deep")) {
    return NextResponse.json({ status: "ok", hasApiKey });
  }

  if (!hasApiKey) {
    return NextResponse.json(
      { status: "error", hasApiKey, probe: { ok: false, error: "API key not configured" } },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${API_FOOTBALL_BASE}/status`, {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      cache: "no-store",
    });

    const data = await res.json();

    const probe = res.ok && data?.response?.account
      ? { ok: true, account: data.response.account, requests: data.response.requests }
      : { ok: false, status: res.status, body: data };

    return NextResponse.json({ status: "ok", hasApiKey, probe });
  } catch (err) {
    return NextResponse.json(
      { status: "error", hasApiKey, probe: { ok: false, error: String(err) } },
      { status: 500 }
    );
  }
}
