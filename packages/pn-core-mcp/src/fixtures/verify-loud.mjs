const chunk = "x".repeat(3000);
process.stdout.write(chunk);
process.stdout.write(chunk);
process.stdout.write(chunk);
process.stderr.write(chunk);
process.stderr.write("\n");
