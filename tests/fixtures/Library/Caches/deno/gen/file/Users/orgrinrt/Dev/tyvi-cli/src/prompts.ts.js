/**
 * User prompt utilities
 *
 * This module provides interactive prompts for user input,
 * confirmation, and selection.
 *
 * @module
 */
/**
 * Prompt user for confirmation (yes/no)
 */ export async function confirm(message) {
  const answer = await input(`${message} (y/n)`);
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}
/**
 * Prompt user to select from a list of options
 */ export async function select(message, options) {
  console.log(message);
  options.forEach((option, i) => {
    console.log(`  ${i + 1}. ${String(option)}`);
  });
  const answer = await input("Enter number");
  const index = parseInt(answer, 10) - 1;
  const selected = options[index];
  if (index >= 0 && index < options.length && selected !== undefined) {
    return selected;
  }
  throw new Error(`Invalid selection. Please enter a number between 1 and ${options.length}`);
}
/**
 * Prompt user for text input
 */ export async function input(message, defaultValue) {
  const prompt = defaultValue ? `${message} [${defaultValue}]: ` : `${message}: `;
  // Write prompt to stderr so it doesn't interfere with piped output
  await Deno.stderr.write(new TextEncoder().encode(prompt));
  // Read from stdin
  const buf = new Uint8Array(1024);
  const n = await Deno.stdin.read(buf);
  if (n === null) {
    // EOF
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error("No input received (EOF)");
  }
  const text = new TextDecoder().decode(buf.subarray(0, n)).trim();
  if (text === "" && defaultValue !== undefined) {
    return defaultValue;
  }
  return text;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vVXNlcnMvb3JncmlucnQvRGV2L3R5dmktY2xpL3NyYy9wcm9tcHRzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVXNlciBwcm9tcHQgdXRpbGl0aWVzXG4gKlxuICogVGhpcyBtb2R1bGUgcHJvdmlkZXMgaW50ZXJhY3RpdmUgcHJvbXB0cyBmb3IgdXNlciBpbnB1dCxcbiAqIGNvbmZpcm1hdGlvbiwgYW5kIHNlbGVjdGlvbi5cbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxuLyoqXG4gKiBQcm9tcHQgdXNlciBmb3IgY29uZmlybWF0aW9uICh5ZXMvbm8pXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb25maXJtKG1lc3NhZ2U6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCBhbnN3ZXIgPSBhd2FpdCBpbnB1dChgJHttZXNzYWdlfSAoeS9uKWApO1xuICByZXR1cm4gYW5zd2VyLnRvTG93ZXJDYXNlKCkgPT09IFwieVwiIHx8IGFuc3dlci50b0xvd2VyQ2FzZSgpID09PSBcInllc1wiO1xufVxuXG4vKipcbiAqIFByb21wdCB1c2VyIHRvIHNlbGVjdCBmcm9tIGEgbGlzdCBvZiBvcHRpb25zXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZWxlY3Q8VD4obWVzc2FnZTogc3RyaW5nLCBvcHRpb25zOiBUW10pOiBQcm9taXNlPFQ+IHtcbiAgY29uc29sZS5sb2cobWVzc2FnZSk7XG4gIG9wdGlvbnMuZm9yRWFjaCgob3B0aW9uLCBpKSA9PiB7XG4gICAgY29uc29sZS5sb2coYCAgJHtpICsgMX0uICR7U3RyaW5nKG9wdGlvbil9YCk7XG4gIH0pO1xuXG4gIGNvbnN0IGFuc3dlciA9IGF3YWl0IGlucHV0KFwiRW50ZXIgbnVtYmVyXCIpO1xuICBjb25zdCBpbmRleCA9IHBhcnNlSW50KGFuc3dlciwgMTApIC0gMTtcblxuICBjb25zdCBzZWxlY3RlZCA9IG9wdGlvbnNbaW5kZXhdO1xuICBpZiAoaW5kZXggPj0gMCAmJiBpbmRleCA8IG9wdGlvbnMubGVuZ3RoICYmIHNlbGVjdGVkICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gc2VsZWN0ZWQ7XG4gIH1cblxuICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgYEludmFsaWQgc2VsZWN0aW9uLiBQbGVhc2UgZW50ZXIgYSBudW1iZXIgYmV0d2VlbiAxIGFuZCAke29wdGlvbnMubGVuZ3RofWAsXG4gICk7XG59XG5cbi8qKlxuICogUHJvbXB0IHVzZXIgZm9yIHRleHQgaW5wdXRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGlucHV0KFxuICBtZXNzYWdlOiBzdHJpbmcsXG4gIGRlZmF1bHRWYWx1ZT86IHN0cmluZyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHByb21wdCA9IGRlZmF1bHRWYWx1ZVxuICAgID8gYCR7bWVzc2FnZX0gWyR7ZGVmYXVsdFZhbHVlfV06IGBcbiAgICA6IGAke21lc3NhZ2V9OiBgO1xuXG4gIC8vIFdyaXRlIHByb21wdCB0byBzdGRlcnIgc28gaXQgZG9lc24ndCBpbnRlcmZlcmUgd2l0aCBwaXBlZCBvdXRwdXRcbiAgYXdhaXQgRGVuby5zdGRlcnIud3JpdGUobmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKHByb21wdCkpO1xuXG4gIC8vIFJlYWQgZnJvbSBzdGRpblxuICBjb25zdCBidWYgPSBuZXcgVWludDhBcnJheSgxMDI0KTtcbiAgY29uc3QgbiA9IGF3YWl0IERlbm8uc3RkaW4ucmVhZChidWYpO1xuXG4gIGlmIChuID09PSBudWxsKSB7XG4gICAgLy8gRU9GXG4gICAgaWYgKGRlZmF1bHRWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBpbnB1dCByZWNlaXZlZCAoRU9GKVwiKTtcbiAgfVxuXG4gIGNvbnN0IHRleHQgPSBuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUoYnVmLnN1YmFycmF5KDAsIG4pKS50cmltKCk7XG5cbiAgaWYgKHRleHQgPT09IFwiXCIgJiYgZGVmYXVsdFZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIHRleHQ7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Q0FPQyxHQUVEOztDQUVDLEdBQ0QsT0FBTyxlQUFlLFFBQVEsT0FBZTtFQUMzQyxNQUFNLFNBQVMsTUFBTSxNQUFNLEdBQUcsUUFBUSxNQUFNLENBQUM7RUFDN0MsT0FBTyxPQUFPLFdBQVcsT0FBTyxPQUFPLE9BQU8sV0FBVyxPQUFPO0FBQ2xFO0FBRUE7O0NBRUMsR0FDRCxPQUFPLGVBQWUsT0FBVSxPQUFlLEVBQUUsT0FBWTtFQUMzRCxRQUFRLEdBQUcsQ0FBQztFQUNaLFFBQVEsT0FBTyxDQUFDLENBQUMsUUFBUTtJQUN2QixRQUFRLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sU0FBUztFQUM3QztFQUVBLE1BQU0sU0FBUyxNQUFNLE1BQU07RUFDM0IsTUFBTSxRQUFRLFNBQVMsUUFBUSxNQUFNO0VBRXJDLE1BQU0sV0FBVyxPQUFPLENBQUMsTUFBTTtFQUMvQixJQUFJLFNBQVMsS0FBSyxRQUFRLFFBQVEsTUFBTSxJQUFJLGFBQWEsV0FBVztJQUNsRSxPQUFPO0VBQ1Q7RUFFQSxNQUFNLElBQUksTUFDUixDQUFDLHVEQUF1RCxFQUFFLFFBQVEsTUFBTSxFQUFFO0FBRTlFO0FBRUE7O0NBRUMsR0FDRCxPQUFPLGVBQWUsTUFDcEIsT0FBZSxFQUNmLFlBQXFCO0VBRXJCLE1BQU0sU0FBUyxlQUNYLEdBQUcsUUFBUSxFQUFFLEVBQUUsYUFBYSxHQUFHLENBQUMsR0FDaEMsR0FBRyxRQUFRLEVBQUUsQ0FBQztFQUVsQixtRUFBbUU7RUFDbkUsTUFBTSxLQUFLLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxjQUFjLE1BQU0sQ0FBQztFQUVqRCxrQkFBa0I7RUFDbEIsTUFBTSxNQUFNLElBQUksV0FBVztFQUMzQixNQUFNLElBQUksTUFBTSxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUM7RUFFaEMsSUFBSSxNQUFNLE1BQU07SUFDZCxNQUFNO0lBQ04sSUFBSSxpQkFBaUIsV0FBVztNQUM5QixPQUFPO0lBQ1Q7SUFDQSxNQUFNLElBQUksTUFBTTtFQUNsQjtFQUVBLE1BQU0sT0FBTyxJQUFJLGNBQWMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLEdBQUcsSUFBSSxJQUFJO0VBRTlELElBQUksU0FBUyxNQUFNLGlCQUFpQixXQUFXO0lBQzdDLE9BQU87RUFDVDtFQUVBLE9BQU87QUFDVCJ9
// denoCacheMetadata=15457147101880780392,3357067252531629076
