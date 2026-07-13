/**
 * Prisma database seed script.
 * Run with: npx prisma db seed
 *
 * This migrates the same data as store.seed.json into PostgreSQL.
 * Set DATABASE_URL in .env before running.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Upsert societies
  const greenMeadows = await prisma.society.upsert({
    where: { id: "soc_green" },
    update: {},
    create: { id: "soc_green", name: "Green Meadows Society" },
  });
  const sunriseHeights = await prisma.society.upsert({
    where: { id: "soc_sunrise" },
    update: {},
    create: { id: "soc_sunrise", name: "Sunrise Heights" },
  });

  console.log("✅ Societies:", greenMeadows.name, sunriseHeights.name);

  // Upsert chefs
  const chefNeha = await prisma.chef.upsert({
    where: { id: "chef_neha" },
    update: {},
    create: {
      id: "chef_neha",
      name: "Neha Sharma",
      phone: "+919900001111",
      societyId: "soc_green",
      rating: 4.8,
      isVerified: true,
      bio: "North Indian home-style meals with low oil.",
    },
  });
  const chefFatima = await prisma.chef.upsert({
    where: { id: "chef_fatima" },
    update: {},
    create: {
      id: "chef_fatima",
      name: "Fatima Khan",
      phone: "+919900002222",
      societyId: "soc_green",
      rating: 4.7,
      isVerified: true,
      bio: "Biryani and kebab specialist for family dinners.",
    },
  });
  const chefRadhika = await prisma.chef.upsert({
    where: { id: "chef_radhika" },
    update: {},
    create: {
      id: "chef_radhika",
      name: "Radhika Iyer",
      phone: "+919900003333",
      societyId: "soc_sunrise",
      rating: 4.9,
      isVerified: true,
      bio: "South Indian tiffin and meal bowls.",
    },
  });
  console.log("✅ Chefs:", chefNeha.name, chefFatima.name, chefRadhika.name);

  // Upsert customers
  const custArjun = await prisma.customer.upsert({
    where: { id: "cust_arjun" },
    update: {},
    create: {
      id: "cust_arjun",
      name: "Arjun Rao",
      phone: "+919811110001",
      societyId: "soc_green",
      address: "A-603, Green Meadows Society",
    },
  });
  const custPriya = await prisma.customer.upsert({
    where: { id: "cust_priya" },
    update: {},
    create: {
      id: "cust_priya",
      name: "Priya Nair",
      phone: "+919811110002",
      societyId: "soc_green",
      address: "B-1102, Green Meadows Society",
    },
  });
  const custMeera = await prisma.customer.upsert({
    where: { id: "cust_meera" },
    update: {},
    create: {
      id: "cust_meera",
      name: "Meera Das",
      phone: "+919811110003",
      societyId: "soc_sunrise",
      address: "C-201, Sunrise Heights",
    },
  });
  console.log("✅ Customers:", custArjun.name, custPriya.name, custMeera.name);

  // Upsert dishes
  await prisma.dish.upsert({
    where: { id: "dish_rajma" },
    update: {},
    create: {
      id: "dish_rajma",
      chefId: "chef_neha",
      name: "Rajma Rice Bowl",
      description: "Homemade rajma with jeera rice and salad.",
      price: 139,
      quantityAvailable: 15,
      cutoffTime: "11:00",
      tags: ["lunch", "veg"],
    },
  });
  await prisma.dish.upsert({
    where: { id: "dish_biryani" },
    update: {},
    create: {
      id: "dish_biryani",
      chefId: "chef_fatima",
      name: "Chicken Dum Biryani",
      description: "Slow-cooked dum biryani with raita.",
      price: 219,
      quantityAvailable: 10,
      cutoffTime: "12:00",
      tags: ["lunch", "non-veg"],
    },
  });
  await prisma.dish.upsert({
    where: { id: "dish_idli" },
    update: {},
    create: {
      id: "dish_idli",
      chefId: "chef_radhika",
      name: "Idli Sambar Combo",
      description: "4 idlis, sambar, and coconut chutney.",
      price: 129,
      quantityAvailable: 20,
      cutoffTime: "09:30",
      tags: ["breakfast", "veg"],
    },
  });
  console.log("✅ Dishes seeded");

  console.log("🎉 Database seeded successfully!");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
