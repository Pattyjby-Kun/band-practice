import { NextRequest, NextResponse } from "next/server";
import { createAuthedSupabaseClient } from "@/lib/supabase/server";
import { formatAppError, isDevelopment, logVoteDebug } from "@/lib/errors";
import { getSongById, toggleVote } from "@/lib/db";

function errorResponse(error: unknown, status = 500) {
  const message = isDevelopment()
    ? formatAppError(error)
    : "Failed to record vote";

  const body: Record<string, unknown> = { error: message };

  if (isDevelopment() && error && typeof error === "object") {
    const err = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };
    body.code = err.code;
    body.details = err.details;
    body.hint = err.hint;
  }

  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    const body = await request.json();
    const { song_id, vote_type } = body;

    logVoteDebug("request", {
      body: { song_id, vote_type },
      hasAuthHeader: Boolean(authHeader),
      hasAccessToken: Boolean(accessToken),
    });

    if (!accessToken) {
      return NextResponse.json(
        { error: "Sign in required to vote" },
        { status: 401 }
      );
    }

    if (!song_id || !(await getSongById(String(song_id)))) {
      return NextResponse.json({ error: "Invalid song" }, { status: 400 });
    }
    if (vote_type !== "like" && vote_type !== "dislike") {
      return NextResponse.json(
        { error: "vote_type must be 'like' or 'dislike'" },
        { status: 400 }
      );
    }

    const authedClient = createAuthedSupabaseClient(accessToken);

    const {
      data: { user: tokenUser },
      error: tokenError,
    } = await authedClient.auth.getUser(accessToken);

    logVoteDebug("request.auth", {
      authUid: tokenUser?.id ?? null,
      email: tokenUser?.email ?? null,
      tokenError: tokenError
        ? {
            message: tokenError.message,
            code: tokenError.code,
            status: tokenError.status,
          }
        : null,
    });

    if (tokenError) {
      return errorResponse(tokenError, 401);
    }
    if (!tokenUser) {
      return NextResponse.json(
        { error: "Sign in required to vote" },
        { status: 401 }
      );
    }

    const song = await toggleVote(
      authedClient,
      String(song_id),
      vote_type,
      accessToken
    );

    logVoteDebug("response", {
      songId: song.id,
      likes: song.likes,
      dislikes: song.dislikes,
      voteScore: song.vote_score,
    });

    return NextResponse.json(song);
  } catch (error) {
    logVoteDebug("response.error", {
      message: formatAppError(error),
      error,
    });

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Sign in required to vote" },
        { status: 401 }
      );
    }

    return errorResponse(error, 500);
  }
}
