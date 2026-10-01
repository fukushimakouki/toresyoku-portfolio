document.addEventListener("DOMContentLoaded", () => {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let selectedDate = new Date(today);

    let displayedMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    );


    function dateKey(date) {

        const year = date.getFullYear();

        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            date.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    function japaneseDate(date) {

        return new Intl.DateTimeFormat(
            "ja-JP",
            {
                month: "long",
                day: "numeric",
                weekday: "short"
            }
        ).format(date);
    }


    function shortDate(date) {
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }


    function sameDate(first, second) {

        return (
            first.getFullYear() === second.getFullYear()
            && first.getMonth() === second.getMonth()
            && first.getDate() === second.getDate()
        );
    }


    function average(numbers) {

        if (numbers.length === 0) {
            return 0;
        }

        return numbers.reduce(
            (total, number) => total + number,
            0
        ) / numbers.length;
    }


    function signedDecimal(number, unit) {

        const sign = number > 0 ? "+" : "";

        return `${sign}${number.toFixed(1)} ${unit}`;
    }


    function signedInteger(number, unit) {

        const sign = number > 0 ? "+" : "";

        return `${sign}${Math.round(number).toLocaleString()} ${unit}`;
    }


    // 保存した日別記録だけを表示する。提案は実績として扱わない。
    const dailyRecords = new Map();
    const weightHistory = [];
    const calorieHistory = [];

    /* ========================================
       日別記録表示
    ========================================= */

    const selectedDateTitle =
        document.getElementById("selected-date-title");

    const mealRecordList =
        document.getElementById("meal-record-list");

    const workoutRecordList =
        document.getElementById("workout-record-list");

    const totalIntake =
        document.getElementById("total-intake-calories");

    const totalWorkout =
        document.getElementById("total-workout-calories");

    const dailyBalance =
        document.getElementById("daily-calorie-balance");


    function recordElement(record, showNutrients = false) {

        const element = document.createElement("article");
        element.className = "record-item";

        const name = document.createElement("span");
        name.textContent = record.name;

        const calories = document.createElement("strong");
        calories.textContent =
            `${record.calories.toLocaleString()} kcal`;

        element.append(name, calories);
        if (showNutrients) {
            const category = document.createElement("span");
            category.className = "record-item__category";
            category.textContent = window.recordStore.mealCategories
                .find(item => item.value === record.category)?.label ?? "未分類";
            name.prepend(category);
            const values = window.recordStore.nutrientFields
                .filter(({ key }) => Number.isFinite(record[key]))
                .map(({ key, label }) => `${label} ${record[key].toLocaleString("ja-JP", { maximumFractionDigits: 2 })} g`);
            if (values.length) {
                const nutrients = document.createElement("p");
                nutrients.className = "record-item__nutrients";
                nutrients.textContent = values.join(" / ");
                element.classList.add("record-item--nutrients");
                element.append(nutrients);
            }
        }

        return element;
    }


    function emptyElement(message) {

        const element = document.createElement("p");

        element.className = "empty-record";
        element.textContent = message;

        return element;
    }


    function renderDailyRecord() {
        document.getElementById("record-entry").dataset.date = dateKey(selectedDate);
        document.dispatchEvent(new CustomEvent("record-date-changed", { detail: dateKey(selectedDate) }));

        selectedDateTitle.textContent =
            `${japaneseDate(selectedDate)}の記録`;

        const record =
            dailyRecords.get(dateKey(selectedDate));

        mealRecordList.replaceChildren();
        workoutRecordList.replaceChildren();


        if (!record) {

            mealRecordList.append(
                emptyElement("この日の食事記録はありません")
            );

            workoutRecordList.append(
                emptyElement("この日の運動記録はありません")
            );

            totalIntake.textContent = "0 kcal";
            totalWorkout.textContent = "0 kcal";
            dailyBalance.textContent = "-- kcal";

            return;
        }


        const categoryOrder = new Map(window.recordStore.mealCategories.map((category, index) => [category.value, index]));
        const categoryRank = meal => categoryOrder.get(meal.category) ?? categoryOrder.size;
        [...record.meals].sort((first, second) => categoryRank(first) - categoryRank(second)).forEach((meal) => {
            mealRecordList.append(recordElement(meal, true));
        });
        if (!record.meals.length) mealRecordList.append(emptyElement("この日の食事記録はありません"));


        record.workouts.forEach((workout) => {
            workoutRecordList.append(recordElement(workout));
        });
        if (!record.workouts.length) workoutRecordList.append(emptyElement("この日の運動記録はありません"));


        const intake = record.meals.reduce(
            (total, meal) => total + meal.calories,
            0
        );


        const workout = record.workouts.reduce(
            (total, exercise) =>
                total + exercise.calories,
            0
        );


        const balance =
            intake - record.totalBurnedCalories;


        totalIntake.textContent =
            `${intake.toLocaleString()} kcal`;

        totalWorkout.textContent =
            `${workout.toLocaleString()} kcal`;

        dailyBalance.textContent =
            record.meals.length || record.workouts.length ? signedInteger(balance, "kcal") : "-- kcal";
    }


    /* ========================================
       カレンダー
    ========================================= */

    const calendarTitle =
        document.getElementById("calendar-title");

    const calendarGrid =
        document.getElementById("calendar-grid");


    function hasRecord(date) {

        const key = dateKey(date);

        return (
            dailyRecords.has(key)
            || weightHistory.some(
                (item) => dateKey(item.date) === key
            )
            || calorieHistory.some(
                (item) => dateKey(item.date) === key
            )
        );
    }


    function renderCalendar() {

        calendarGrid.replaceChildren();

        const year = displayedMonth.getFullYear();
        const month = displayedMonth.getMonth();

        calendarTitle.textContent =
            `${year}年 ${month + 1}月`;

        const firstWeekday =
            new Date(year, month, 1).getDay();


        for (let index = 0; index < 42; index += 1) {

            const date = new Date(
                year,
                month,
                index - firstWeekday + 1
            );

            date.setHours(0, 0, 0, 0);


            const button = document.createElement("button");

            button.type = "button";
            button.className = "calendar-day";


            if (date.getMonth() !== month) {
                button.classList.add("is-outside");
            }

            if (sameDate(date, today)) {
                button.classList.add("is-today");
            }

            if (sameDate(date, selectedDate)) {
                button.classList.add("is-selected");
            }

            if (hasRecord(date)) {
                button.classList.add("has-record");
            }


            const number = document.createElement("span");

            number.textContent = date.getDate();


            const dot = document.createElement("span");

            dot.className = "calendar-day__dot";


            button.append(number, dot);


            button.addEventListener("click", () => {

                selectedDate = new Date(date);

                displayedMonth = new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    1
                );

                renderCalendar();
                renderDailyRecord();
                renderCalorieView();
            });


            calendarGrid.append(button);
        }
    }


    document
        .getElementById("previous-month")
        .addEventListener("click", () => {

            displayedMonth = new Date(
                displayedMonth.getFullYear(),
                displayedMonth.getMonth() - 1,
                1
            );

            renderCalendar();
        });


    document
        .getElementById("next-month")
        .addEventListener("click", () => {

            displayedMonth = new Date(
                displayedMonth.getFullYear(),
                displayedMonth.getMonth() + 1,
                1
            );

            renderCalendar();
        });


    /* ========================================
       増減の色
    ========================================= */

    function setDifferenceColor(element, number) {

        element.classList.remove("is-up", "is-down");

        if (number > 0) {
            element.classList.add("is-up");
        }

        if (number < 0) {
            element.classList.add("is-down");
        }
    }


    /* ========================================
       体重
    ========================================= */

    function renderWeightView() {

        if (!weightHistory.length) {
            for (const id of ["current-weight", "previous-weight-difference", "weekly-weight-average", "monthly-weight-average", "total-weight-change"]) {
                const element = document.getElementById(id);
                element.textContent = "-- kg";
                setDifferenceColor(element, 0);
            }
            renderWeightTable();
            renderWeightBars();
            return;
        }

        const latest =
            weightHistory[weightHistory.length - 1];

        const previous =
            weightHistory[weightHistory.length - 2];

        const difference =
            previous ? latest.weight - previous.weight : null;

        const weekly =
            weightHistory.slice(-7);

        const weeklyAverage =
            average(weekly.map((item) => item.weight));

        const monthly =
            weightHistory.filter((item) => (
                item.date.getFullYear() === latest.date.getFullYear()
                && item.date.getMonth() === latest.date.getMonth()
            ));

        const monthlyAverage =
            average(monthly.map((item) => item.weight));

        const totalChange =
            latest.weight - weightHistory[0].weight;


        document.getElementById("current-weight").textContent =
            `${latest.weight.toFixed(1)} kg`;

        const differenceElement =
            document.getElementById(
                "previous-weight-difference"
            );

        differenceElement.textContent =
            difference === null ? "-- kg" : signedDecimal(difference, "kg");

        setDifferenceColor(
            differenceElement,
            difference
        );


        document.getElementById(
            "weekly-weight-average"
        ).textContent =
            `${weeklyAverage.toFixed(1)} kg`;


        document.getElementById(
            "monthly-weight-average"
        ).textContent =
            `${monthlyAverage.toFixed(1)} kg`;


        const totalChangeElement =
            document.getElementById(
                "total-weight-change"
            );

        totalChangeElement.textContent =
            signedDecimal(totalChange, "kg");

        setDifferenceColor(
            totalChangeElement,
            totalChange
        );


        renderWeightTable();
        renderWeightBars();
    }


    function renderWeightTable() {

        const body =
            document.getElementById("weight-history-body");

        body.replaceChildren();


        [...weightHistory]
            .reverse()
            .forEach((record, reversedIndex) => {

                const originalIndex =
                    weightHistory.length - reversedIndex - 1;

                const previous =
                    weightHistory[originalIndex - 1];

                const difference =
                    previous
                        ? record.weight - previous.weight
                        : null;


                const row = document.createElement("tr");

                const dateCell = document.createElement("td");
                dateCell.textContent = shortDate(record.date);

                const weightCell = document.createElement("td");
                weightCell.textContent =
                    `${record.weight.toFixed(1)} kg`;

                const differenceCell =
                    document.createElement("td");

                differenceCell.textContent =
                    difference === null
                        ? "--"
                        : signedDecimal(difference, "kg");


                if (difference !== null) {

                    differenceCell.style.color =
                        difference < 0
                            ? "#07885f"
                            : difference > 0
                                ? "#d91f36"
                                : "";
                }


                row.append(
                    dateCell,
                    weightCell,
                    differenceCell
                );

                body.append(row);
            });
    }


    function renderWeightBars() {

        const container =
            document.getElementById("weight-bars");

        const detail =
            document.getElementById("weight-point-detail");

        container.replaceChildren();

        if (!weightHistory.length) {
            document.getElementById("weight-period").textContent = "体重の記録はまだありません";
            detail.textContent = "「記録する」から体重を入力すると、推移を確認できます。";
            return;
        }

        const weights =
            weightHistory.map((item) => item.weight);

        const targetWeight = window.recordProfile?.targetWeightKg;
        const hasTarget = Number.isFinite(targetWeight) && targetWeight >= 1 && targetWeight <= 499.9;
        const scaleWeights = hasTarget ? [...weights, targetWeight] : weights;

        const minimum =
            Math.min(...scaleWeights) - 0.5;

        const maximum =
            Math.max(...scaleWeights) + 0.3;

        const range =
            maximum - minimum;

        const heightForWeight = weight => 20 + ((weight - minimum) / range) * 70;
        container.style.setProperty("--weight-count", String(weightHistory.length));


        document.getElementById("weight-period").textContent =
            `${shortDate(weightHistory[0].date)} 〜 `
            + `${shortDate(weightHistory[weightHistory.length - 1].date)}`;


        weightHistory.forEach((record, index) => {

            const height =
                heightForWeight(record.weight);


            const item = document.createElement("div");
            item.className = "weight-bar-item";


            const space = document.createElement("div");
            space.className = "weight-bar-space";


            const value = document.createElement("span");
            value.className = "weight-bar-value";
            value.textContent = record.weight.toFixed(1);
            value.style.setProperty(
                "--bar-height",
                `${height}%`
            );


            const bar = document.createElement("button");
            bar.type = "button";
            bar.className = "weight-bar";
            bar.style.setProperty(
                "--bar-height",
                `${height}%`
            );


            if (index === weightHistory.length - 1) {
                bar.classList.add("is-selected");
            }


            bar.addEventListener("click", () => {

                document
                    .querySelectorAll(".weight-bar")
                    .forEach((element) => {
                        element.classList.remove("is-selected");
                    });

                bar.classList.add("is-selected");

                detail.textContent =
                    `${japaneseDate(record.date)}：`
                    + `${record.weight.toFixed(1)} kg`;
            });


            const date = document.createElement("span");
            date.className = "weight-bar-date";
            date.textContent = shortDate(record.date);


            space.append(value, bar);
            item.append(space, date);
            container.append(item);
        });

        if (hasTarget) {
            const overlay = document.createElement("div");
            overlay.className = "weight-target-overlay";
            const line = document.createElement("div");
            line.className = "weight-target-line";
            line.style.setProperty("--target-height", `${heightForWeight(targetWeight)}%`);
            const label = document.createElement("span");
            label.className = "weight-target-label";
            label.textContent = `目標体重 ${targetWeight.toFixed(1)} kg`;
            line.append(label);
            overlay.append(line);
            container.append(overlay);
        }

        const latest =
            weightHistory[weightHistory.length - 1];

        detail.textContent =
            `${japaneseDate(latest.date)}：`
            + `${latest.weight.toFixed(1)} kg`;
    }


    /* ========================================
       カロリー
    ========================================= */

    function selectedCalorieRecord() {

        return calorieHistory.find(
            (item) => sameDate(item.date, selectedDate)
        );
    }


    function renderCalorieView() {

        const selectedRecord =
            selectedCalorieRecord();

        const selectedDateText =
            japaneseDate(selectedDate);


        document.getElementById(
            "selected-calorie-date"
        ).textContent =
            `${selectedDateText}のカロリー`;


        document.getElementById(
            "calorie-chart-date"
        ).textContent =
            selectedDateText;


        const latestSeven =
            calorieHistory.slice(-7);

        const averageIntake =
            average(latestSeven.map((item) => item.intake));

        const averageBurned =
            average(latestSeven.map((item) => item.burned));

        const weeklyBalance =
            latestSeven.reduce(
                (total, item) =>
                    total + item.intake - item.burned,
                0
            );


        document.getElementById(
            "average-intake-calories"
        ).textContent =
            latestSeven.length ? `${Math.round(averageIntake).toLocaleString()} kcal` : "-- kcal";


        document.getElementById(
            "average-burned-calories"
        ).textContent =
            latestSeven.length ? `${Math.round(averageBurned).toLocaleString()} kcal` : "-- kcal";


        const weeklyBalanceElement =
            document.getElementById(
                "weekly-calorie-balance"
            );

        weeklyBalanceElement.textContent =
            latestSeven.length ? signedInteger(weeklyBalance, "kcal") : "-- kcal";

        setDifferenceColor(
            weeklyBalanceElement,
            weeklyBalance
        );


        const donut =
            document.getElementById("calorie-donut");

        const selectedIntake =
            document.getElementById(
                "selected-intake-calories"
            );

        const selectedBurned =
            document.getElementById(
                "selected-burned-calories"
            );

        const donutBalance =
            document.getElementById("donut-balance");

        const donutIntake =
            document.getElementById("donut-intake");

        const donutBurned =
            document.getElementById("donut-burned");

        const intakePercentageElement =
            document.getElementById(
                "donut-intake-percentage"
            );

        const burnedPercentageElement =
            document.getElementById(
                "donut-burned-percentage"
            );

        const message =
            document.getElementById("calorie-message");


        if (!selectedRecord) {

            selectedIntake.textContent = "-- kcal";
            selectedBurned.textContent = "-- kcal";
            donutBalance.textContent = "-- kcal";
            donutIntake.textContent = "-- kcal";
            donutBurned.textContent = "-- kcal";
            intakePercentageElement.textContent = "--%";
            burnedPercentageElement.textContent = "--%";

            donut.classList.add("is-empty");

            message.textContent =
                "この日のカロリー記録はありません";

            renderCalorieTable();

            return;
        }


        donut.classList.remove("is-empty");


        const difference =
            selectedRecord.intake - selectedRecord.burned;

        const total =
            selectedRecord.intake + selectedRecord.burned;

        donut.classList.toggle("is-empty", total === 0);

        const intakePercentage =
            total === 0
                ? 0
                : selectedRecord.intake / total * 100;

        const burnedPercentage =
            total === 0 ? 0 : 100 - intakePercentage;


        donut.style.setProperty(
            "--intake-angle",
            `${intakePercentage * 3.6}deg`
        );


        selectedIntake.textContent =
            `${selectedRecord.intake.toLocaleString()} kcal`;

        selectedBurned.textContent =
            `${selectedRecord.burned.toLocaleString()} kcal`;

        donutBalance.textContent =
            signedInteger(difference, "kcal");

        donutIntake.textContent =
            `${selectedRecord.intake.toLocaleString()} kcal`;

        donutBurned.textContent =
            `${selectedRecord.burned.toLocaleString()} kcal`;

        intakePercentageElement.textContent =
            `${intakePercentage.toFixed(1)}%`;

        burnedPercentageElement.textContent =
            `${burnedPercentage.toFixed(1)}%`;


        if (difference > 0) {

            message.textContent =
                `摂取が消費より`
                + `${difference.toLocaleString()} kcal多い状態です。`;

        } else if (difference < 0) {

            message.textContent =
                `消費が摂取より`
                + `${Math.abs(difference).toLocaleString()} kcal多い状態です。`;

        } else {

            message.textContent =
                "摂取と消費が同じです。";
        }


        renderCalorieTable();
    }


    function renderCalorieTable() {

        const body =
            document.getElementById("calorie-history-body");

        body.replaceChildren();


        [...calorieHistory]
            .reverse()
            .forEach((record) => {

                const difference =
                    record.intake - record.burned;

                const row = document.createElement("tr");


                if (sameDate(record.date, selectedDate)) {
                    row.classList.add("is-selected");
                }


                const dateCell = document.createElement("td");
                dateCell.textContent = shortDate(record.date);

                const intakeCell = document.createElement("td");
                intakeCell.textContent =
                    record.intake.toLocaleString();

                const burnedCell = document.createElement("td");
                burnedCell.textContent =
                    record.burned.toLocaleString();

                const differenceCell =
                    document.createElement("td");

                differenceCell.textContent =
                    signedInteger(difference, "").trim();


                differenceCell.style.color =
                    difference < 0
                        ? "#07885f"
                        : difference > 0
                            ? "#d91f36"
                            : "";


                row.append(
                    dateCell,
                    intakeCell,
                    burnedCell,
                    differenceCell
                );


                row.addEventListener("click", () => {

                    selectedDate = new Date(record.date);

                    displayedMonth = new Date(
                        selectedDate.getFullYear(),
                        selectedDate.getMonth(),
                        1
                    );

                    renderCalendar();
                    renderDailyRecord();
                    renderCalorieView();
                });


                body.append(row);
            });
    }


    /* ========================================
       画面切り替え
    ========================================= */

    const viewNames = [
        "calendar",
        "weight",
        "calories",
        "feedback"
    ];

    const viewLabels = {
        calendar: "カレンダー",
        weight: "体重の推移",
        calories: "カロリー",
        feedback: "振り返り"
    };

    let currentViewIndex = 0;

    const viewTrack =
        document.getElementById("view-track");

    const viewButtons =
        document.querySelectorAll(
            ".record-view-tabs__button"
        );

    const leftViews =
        document.querySelectorAll("[data-left-view]");

    const centerViews =
        document.querySelectorAll("[data-center-view]");

    const previousLabel =
        document.getElementById("previous-view-label");

    const nextLabel =
        document.getElementById("next-view-label");


    function switchView(viewName) {

        const index = viewNames.indexOf(viewName);

        if (index === -1) {
            return;
        }

        currentViewIndex = index;

        viewTrack.style.transform =
            `translateX(-${index * 100}%)`;


        viewButtons.forEach((button) => {

            const active =
                button.dataset.view === viewName;

            button.classList.toggle(
                "record-view-tabs__button--active",
                active
            );

            button.setAttribute(
                "aria-selected",
                String(active)
            );
        });


        leftViews.forEach((view) => {

            view.classList.toggle(
                "left-content--active",
                view.dataset.leftView === viewName
            );
        });


        centerViews.forEach((view) => {
            view.inert = view.dataset.centerView !== viewName;

            view.setAttribute(
                "aria-hidden",
                String(
                    view.dataset.centerView !== viewName
                )
            );
        });


        const previous =
            viewNames[index - 1];

        const next =
            viewNames[index + 1];


        previousLabel.textContent =
            previous
                ? `← ${viewLabels[previous]}`
                : "";

        nextLabel.textContent =
            next
                ? `${viewLabels[next]} →`
                : "";
        document.dispatchEvent(new CustomEvent("record-view-changed", { detail: viewName }));
    }

    document.addEventListener("record-view-request", event => switchView(event.detail));


    viewButtons.forEach((button) => {

        button.addEventListener("click", () => {
            switchView(button.dataset.view);
        });
    });


    function previousView() {

        if (currentViewIndex > 0) {

            switchView(
                viewNames[currentViewIndex - 1]
            );
        }
    }


    function nextView() {

        if (currentViewIndex < viewNames.length - 1) {

            switchView(
                viewNames[currentViewIndex + 1]
            );
        }
    }


    /* ========================================
       スワイプ
    ========================================= */

    const viewport =
        document.getElementById("view-viewport");

    let startX = 0;
    let startY = 0;
    let pointerDown = false;


    viewport.addEventListener("pointerdown", (event) => {

        startX = event.clientX;
        startY = event.clientY;
        pointerDown = true;
    });


    viewport.addEventListener("pointerup", (event) => {

        if (!pointerDown) {
            return;
        }

        pointerDown = false;

        const moveX = event.clientX - startX;
        const moveY = event.clientY - startY;

        const horizontal =
            Math.abs(moveX) > 55
            && Math.abs(moveX) > Math.abs(moveY) * 1.2;

        if (!horizontal) {
            return;
        }

        if (moveX < 0) {
            nextView();
        } else {
            previousView();
        }
    });


    viewport.addEventListener("pointercancel", () => {
        pointerDown = false;
    });


    /* ========================================
       横スクロール
    ========================================= */

    let wheelLocked = false;


    viewport.addEventListener(
        "wheel",
        (event) => {

            const horizontal =
                Math.abs(event.deltaX);

            const shiftHorizontal =
                event.shiftKey
                    ? Math.abs(event.deltaY)
                    : 0;

            if (
                Math.max(horizontal, shiftHorizontal) < 25
                || wheelLocked
            ) {
                return;
            }

            event.preventDefault();

            wheelLocked = true;

            const direction =
                horizontal > 0
                    ? event.deltaX
                    : event.deltaY;

            if (direction > 0) {
                nextView();
            } else {
                previousView();
            }

            window.setTimeout(() => {
                wheelLocked = false;
            }, 500);
        },
        {
            passive: false
        }
    );


    viewport.addEventListener("keydown", (event) => {

        if (event.key === "ArrowLeft") {
            previousView();
        }

        if (event.key === "ArrowRight") {
            nextView();
        }
    });


    /* ========================================
       初期表示
    ========================================= */

    document.addEventListener("profile-updated", renderWeightBars);

    function applySavedRecord(record) {
        const date = new Date(record.date + "T00:00:00");
        const intake = record.meals.reduce((sum, item) => sum + item.calories, 0);
        const burned = record.workouts.reduce((sum, item) => sum + item.calories, 0);
        dailyRecords.set(record.date, { ...record, totalBurnedCalories: burned });
        const replaceHistory = (history, value) => {
            const index = history.findIndex(item => dateKey(item.date) === record.date);
            if (index !== -1) history.splice(index, 1);
            if (value) history.push(value);
            history.sort((first, second) => first.date - second.date);
        };
        replaceHistory(calorieHistory, record.meals.length || record.workouts.length ? { date, intake, burned } : null);
        replaceHistory(weightHistory, record.weight === null ? null : { date, weight: record.weight });
    }
    try { window.recordStore?.all().forEach(applySavedRecord); }
    catch { /* 保存領域が使用できない場合もダッシュボードは表示する。 */ }
    document.addEventListener("daily-record-saved", event => {
        applySavedRecord(event.detail);
        renderCalendar();
        renderDailyRecord();
        renderWeightView();
        renderCalorieView();
    });
    renderCalendar();
    renderDailyRecord();
    renderWeightView();
    renderCalorieView();
    switchView("calendar");

});
