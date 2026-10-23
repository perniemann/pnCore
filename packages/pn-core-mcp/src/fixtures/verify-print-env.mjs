const value = process.env.VERIFY_TEST_PASSED_VAR;
process.stdout.write(value === undefined ? "absent" : `length=${value.length} value=${value}`);
