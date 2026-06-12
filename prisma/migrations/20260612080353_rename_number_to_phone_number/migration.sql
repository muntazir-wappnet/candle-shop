/*
  Warnings:

  - You are about to drop the column `number` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[phone_number]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `phone_number` to the `User` table without a default value. This is not possible if the table is not empty.

*/
ALTER TABLE "User"
RENAME COLUMN "number" TO "phone_number";

ALTER INDEX "User_number_key"
RENAME TO "User_phone_number_key";