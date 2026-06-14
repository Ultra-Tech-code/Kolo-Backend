import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class GroupService {
    public async createGroup(name: string, amount: number, frequency: string, creatorPhone: string) {
        // Find user by phone
        let user = await prisma.user.findUnique({ where: { phoneNumber: creatorPhone } });
        if (!user) {
            throw new Error("User not registered.");
        }

        const group = await prisma.savingsGroup.create({
            data: {
                name,
                contributionAmount: amount,
                contributionFrequency: frequency,
                members: {
                    create: [
                        {
                            userId: user.id,
                            role: 'CREATOR'
                        }
                    ]
                }
            }
        });
        return group;
    }
}
