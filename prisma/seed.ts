import { db } from "../server/db";
import { seedDemo } from "../server/seed";
try {
  await seedDemo();
} finally {
  await db.$disconnect();
}
