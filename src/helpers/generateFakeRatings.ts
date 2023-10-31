/**
 * Generates fake ratings with 4.8 across all stars
 * @disclaimer GPT4 generated
 */
const generateRatings = () => {
  const total_students = Math.floor(Math.random() * (251 - 100) + 100);
  let five_star = Math.floor(Math.random() * total_students);
  let four_star = Math.floor(Math.random() * (total_students - five_star));
  let three_star = Math.floor(Math.random() * (total_students - five_star - four_star));
  let two_star = Math.floor(Math.random() * (total_students - five_star - four_star - three_star));
  const one_star = total_students - five_star - four_star - three_star - two_star;

  let weighted_average =
    (5 * five_star + 4 * four_star + 3 * three_star + 2 * two_star + 1 * one_star) / total_students;

  while (weighted_average < 4.35) {
    if (two_star > 0) {
      two_star -= 1;
      three_star += 1;
    } else if (three_star > 0) {
      three_star -= 1;
      four_star += 1;
    } else if (four_star > 0) {
      four_star -= 1;
      five_star += 1;
    }

    weighted_average = (5 * five_star + 4 * four_star + 3 * three_star + 2 * two_star + 1 * one_star) / total_students;
  }

  return {
    total_students,
    five_star,
    four_star,
    three_star,
    two_star,
    one_star,
    weighted_average,
  };
};
export default generateRatings;
