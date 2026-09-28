import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET players
export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    const players = await prisma.player.findMany({
        where: {
            userId: session.user.id,
        },
        orderBy: {
            shirtNumber: "asc",
        },
    });

    return NextResponse.json(players);
}

// CREATE player
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    const {
        name,
        position,
        role,
        shirtNumber,
        profile,
        photo,
    } = await req.json();

    if (
        !name ||
        !position ||
        !role ||
        shirtNumber === undefined ||
        !profile
    ) {
        return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
        );
    }

    try {
        const player = await prisma.player.create({
            data: {
                name,
                position,
                role,
                shirtNumber,
                profile,
                photo: photo ?? null,
                userId: session.user.id,
            },
        });

        return NextResponse.json(player);
    } catch (error) {
        console.error("Failed to create player:", error);
    
        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                { error: "Shirt number already in use" },
                { status: 409 }
            );
        }
    
        return NextResponse.json(
            { error: "Failed to create player" },
            { status: 500 }
        );
    }
}

// UPDATE player
export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    const {
        id,
        name,
        position,
        role,
        shirtNumber,
        profile,
        photo,
    } = await req.json();

    if (!id) {
        return NextResponse.json(
            { error: "Player ID is required" },
            { status: 400 }
        );
    }

    try {
        const player = await prisma.player.updateMany({
            where: {
                id,
                userId: session.user.id,
            },
            data: {
                ...(name !== undefined && { name }),
                ...(position !== undefined && { position }),
                ...(role !== undefined && { role }),
                ...(shirtNumber !== undefined && { shirtNumber }),
                ...(profile !== undefined && { profile }),
                ...(photo !== undefined && { photo }),
            },
        });

        if (player.count === 0) {
            return NextResponse.json(
                { error: "Player not found" },
                { status: 404 }
            );
        }

        const updatedPlayer = await prisma.player.findFirst({
            where: {
                id,
                userId: session.user.id,
            },
        });

        return NextResponse.json(updatedPlayer);
    } catch (error) {
        console.error("Failed to update player:", error);
    
        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                { error: "Shirt number already in use" },
                { status: 409 }
            );
        }
    
        return NextResponse.json(
            { error: "Failed to update player" },
            { status: 500 }
        );
    }
}

// DELETE player
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    const { id } = await req.json();

    if (!id) {
        return NextResponse.json(
            { error: "Player ID is required" },
            { status: 400 }
        );
    }

    try {
        const deletedPlayer = await prisma.player.deleteMany({
            where: {
                id,
                userId: session.user.id,
            },
        });

        if (deletedPlayer.count === 0) {
            return NextResponse.json(
                { error: "Player not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete player:", error);

        return NextResponse.json(
            { error: "Failed to delete player" },
            { status: 500 }
        );
    }
}