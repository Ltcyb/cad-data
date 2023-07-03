const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

async function main() {
	const data = {};
	var currProvidence = "";

	const queue = ["https://www.universitystudy.ca/canadian-universities/"];
	const numOfUni = 108;

	var currIndex = 0;
	var state = 0;

	var rowData = {};

	while (queue.length > 0 && currIndex < numOfUni) {
		const url = queue.pop();
		const html = await axios.get(url);
		const $ = cheerio.load(html.data);

		switch (state) {
			case 0: {
				$(".university-table tbody")
					.find("tr")
					.each((i, row) => {
						if (currIndex === i) {
							$(row)
								.find("td, th")
								.each((j, cell) => {
									if (j === 0) {
										if ($(cell).find("a").length) {
											rowData.name = $(cell)
												.text()
												.trim();
											queue.push(
												$(cell).find("a").attr("href")
											);
										} else {
											currProvidence = $(cell).text();
										}
									} else {
										rowData.city = $(cell).text().trim();
									}
								});
						}
					});
				if (data[currProvidence] == undefined) {
					data[currProvidence] = [];
					state = 0;
				} else {
					state = 1;
				}
				break;
			}
			case 1: {
				rowData.image =
					"https://www.universitystudy.ca/" +
					$("article > img").attr("src");

				rowData.description =
					$("article > p:not(:contains('Note'), :contains('Source'))")
						.text()
						.trim() +
					" " +
					$(".readmore-content p").text().trim();

				$(".big-purple:not(:contains('$'))").each((i, e) => {
					switch (i) {
						case 0: {
							rowData.enrollmentFtUgrad = $(e).text();
							break;
						}
						case 1: {
							rowData.enrollmentFtGrad = $(e).text();
							break;
						}
						case 2: {
							rowData.enrollmentPtUgrad = $(e).text();
							break;
						}
						case 3: {
							rowData.enrollmentPtGrad = $(e).text();
							break;
						}
					}
				});

				$(".big-purple:contains('$')").each((i, e) => {
					switch (i) {
						case 0: {
							rowData.tuitionCadUgrad = $(e).text();
							break;
						}
						case 1: {
							rowData.tuitionCadGrad = $(e).text();
							break;
						}
						case 2: {
							rowData.tuitionIntlUgrad = $(e).text();
							break;
						}
						case 3: {
							rowData.tuitionIntlGrad = $(e).text();
							break;
						}
					}
				});
				queue.push(
					"https://www.universitystudy.ca/" +
						$(".programs-callout a").attr("href")
				);
				state = 2;
				break;
			}
			case 2: {
				let programs = [];
				$(".programs")
					.find(".program")
					.each((i, e) => {
						let prgm1, prgm2;

						$(e)
							.find(".program-detail-item")
							.each((i, e) => {
								if (i === 0) {
									prgm1 = $(e)
										.clone()
										.text()
										.replace(/\s/g, "")
										.match(/[A-Z][a-z]+/g);
								} else {
									prgm2 = $(e)
										.clone()
										.children()
										.remove()
										.end()
										.text()
										.replace(/\s/g, "")
										.replace(
											"Undergraduatelevelcertificate",
											"Undergraduate"
										)
										.replace(
											"Graduatelevelcertificate",
											"Graduate"
										)
										.match(/[A-Z][a-z]+/g);
								}
							});

						programs.push({
							name: $(e).find(".toggle-view").text(),
							level: prgm2[0],
							website: $(e)
								.find(".program-details a")
								.attr("href"),
							language: prgm1[1],
							coop: prgm1[3],
							distanceEdu: prgm1[6],
						});
					});

				rowData.programs = programs;
				data[currProvidence] = rowData;
				console.log(rowData);
				rowData = {};
				queue.push(
					"https://www.universitystudy.ca/canadian-universities/"
				);
				currIndex += 1;
				state = 0;
				break;
			}
		}
		if (queue.length === 0) {
			queue.unshift(
				"https://www.universitystudy.ca/canadian-universities/"
			);
		}
		console.log("queue: " + queue.length);
	}
	console.log(data);

	fs.writeFileSync("universities.json", JSON.stringify(data), (error) => {
		if (error) throw error;
	});
}

// running the main() function
main()
	.then(() => {
		// successful ending
		process.exit(0);
	})
	.catch((e) => {
		// logging the error message
		console.error(e);

		// unsuccessful ending
		process.exit(1);
	});
