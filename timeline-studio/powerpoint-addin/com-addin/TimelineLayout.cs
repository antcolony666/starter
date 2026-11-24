using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

namespace Tempo.TimelineAddin
{
    internal sealed class Box
    {
        public double Left, Top, Width, Height;
        public Box(double left, double top, double width, double height) { Left = left; Top = top; Width = width; Height = height; }
    }

    internal sealed class AxisSegment
    {
        public string Label;
        public Box Box;
    }

    internal sealed class LaneLayout
    {
        public LaneData Source;
        public Box Background, Label;
        public string BackgroundColor, BorderColor;
    }

    internal sealed class TaskLayout
    {
        public TaskData Source;
        public Box Bar;
        public string DisplayTitle, FillColor, LineColor, TextColor;
        public float FontSize;
    }

    internal sealed class MilestoneLayout
    {
        public TaskData Source;
        public Box Diamond, Label;
        public string LineColor, TextColor;
        public float FontSize;
    }

    internal sealed class TimelineLayout
    {
        public double Width = 960, Height = 540;
        public string Title, Subtitle;
        public Box TitleBox;
        public List<AxisSegment> Months = new List<AxisSegment>();
        public List<AxisSegment> Weeks = new List<AxisSegment>();
        public List<LaneLayout> Lanes = new List<LaneLayout>();
        public List<TaskLayout> Tasks = new List<TaskLayout>();
        public List<MilestoneLayout> Milestones = new List<MilestoneLayout>();
    }

    internal static class TimelineLayoutEngine
    {
        public static TimelineLayout Calculate(TimelineData data, bool overview)
        {
            const double slideWidth = 960, slideHeight = 540;
            const double left = 40, right = 40, top = 32, bottom = 30;
            const double contentWidth = 880, titleHeight = 44, laneLabelWidth = 160;
            const double boardX = 200, boardWidth = 720, monthHeight = 20, weekHeight = 18;
            const double axisTop = 84, lanesTop = 126;
            var result = new TimelineLayout { Title = String.IsNullOrWhiteSpace(data.Title) ? "项目时间线" : data.Title, TitleBox = new Box(left, top, contentWidth, titleHeight) };
            var tasks = data.Tasks ?? new List<TaskData>();
            var valid = tasks.Where(t => t != null && TryDate(t.Start, out _) && TryDate(t.End, out _)).ToList();
            DateTime rangeStart, rangeEnd;
            if (valid.Count == 0)
            {
                rangeStart = DateTime.Today.AddDays(-7);
                rangeEnd = DateTime.Today.AddDays(60);
            }
            else
            {
                var minDate = valid.Min(t => Parse(t.Start));
                var maxDate = valid.Max(t => Parse(t.End));
                rangeStart = minDate.AddDays(-5);
                rangeStart = rangeStart.AddDays(-(((int)rangeStart.DayOfWeek + 6) % 7));
                rangeEnd = maxDate.AddDays(5);
                rangeEnd = rangeEnd.AddDays((7 - (int)rangeEnd.DayOfWeek) % 7);
            }
            int totalDays = Math.Max(1, (int)(rangeEnd - rangeStart).TotalDays);
            double dayWidth = 720.0 / totalDays;
            Func<DateTime, double> dateToX = d => boardX + (d - rangeStart).TotalDays * dayWidth;
            result.Subtitle = String.Format(CultureInfo.InvariantCulture, "时间跨度: {0:yyyy-MM-dd} 至 {1:yyyy-MM-dd} ({2} 天) · 泳道: {3} 条 · 任务: {4} 项", rangeStart, rangeEnd, totalDays, data.Lanes == null ? 0 : data.Lanes.Count, tasks.Count);

            var month = new DateTime(rangeStart.Year, rangeStart.Month, 1);
            while (month <= rangeEnd)
            {
                var nextMonth = month.AddMonths(1);
                var segStart = Math.Max(0, (month - rangeStart).TotalDays);
                var segEnd = Math.Min(totalDays, (nextMonth - rangeStart).TotalDays);
                if (segEnd > segStart)
                    result.Months.Add(new AxisSegment { Label = month.ToString("yyyy年M月", CultureInfo.InvariantCulture), Box = new Box(boardX + segStart * dayWidth, axisTop, (segEnd - segStart) * dayWidth, monthHeight) });
                month = nextMonth;
            }
            for (int day = 0; day < totalDays; day += 7)
            {
                var tick = rangeStart.AddDays(day);
                var x = boardX + day * dayWidth;
                result.Weeks.Add(new AxisSegment { Label = tick.ToString("M/d", CultureInfo.InvariantCulture), Box = new Box(x, axisTop + monthHeight, Math.Min(7 * dayWidth, boardX + boardWidth - x), weekHeight) });
            }

            var lanes = data.Lanes ?? new List<LaneData>();
            int laneCount = Math.Max(1, lanes.Count);
            double availableHeight = slideHeight - bottom - lanesTop;
            double laneHeight = overview ? Math.Min(62, Math.Max(38, Math.Floor(availableHeight / laneCount))) : Math.Min(84, Math.Max(48, Math.Floor(availableHeight / laneCount)));
            double taskBarHeight = overview ? 20 : 26;
            double diamondSize = overview ? 13 : 15;
            for (int i = 0; i < lanes.Count; i++)
            {
                var lane = lanes[i];
                double laneY = lanesTop + i * laneHeight;
                result.Lanes.Add(new LaneLayout
                {
                    Source = lane,
                    Background = new Box(left, laneY, contentWidth, laneHeight),
                    Label = new Box(left + 8, laneY + 4, laneLabelWidth - 16, laneHeight - 8),
                    BackgroundColor = i % 2 == 1 ? "#FBFBF9" : "#FFFFFF",
                    BorderColor = "#E9EAE5"
                });
                foreach (var task in tasks.Where(t => t != null && String.Equals(t.Lane, lane.Id, StringComparison.OrdinalIgnoreCase)))
                {
                    DateTime start, end;
                    if (!TryDate(task.Start, out start) || !TryDate(task.End, out end)) continue;
                    var color = TimelineColors.Get(task.Color);
                    if (task.Milestone)
                    {
                        double centerX = dateToX(start) + dayWidth * .5;
                        double y = laneY + (laneHeight - diamondSize) / 2;
                        double x = Math.Round(centerX - diamondSize / 2);
                        double maxLabelWidth = Math.Min(150, slideWidth - right - (x + diamondSize + 6));
                        result.Milestones.Add(new MilestoneLayout
                        {
                            Source = task,
                            Diamond = new Box(x, y, diamondSize, diamondSize),
                            Label = new Box(x + diamondSize + 6, y - 4, Math.Max(60, maxLabelWidth), 22),
                            LineColor = color.Line,
                            TextColor = color.Text,
                            FontSize = overview ? 8.5f : 9f
                        });
                    }
                    else
                    {
                        double startX = dateToX(start), endX = dateToX(end) + dayWidth;
                        double rawWidth = Math.Max(endX - startX, 24);
                        double barLeft = Math.Max(boardX + 2, startX + 2);
                        double barRight = Math.Min(boardX + boardWidth - 2, barLeft + rawWidth - 4);
                        double barWidth = Math.Max(20, barRight - barLeft);
                        double barTop = laneY + (laneHeight - taskBarHeight) / 2;
                        int capacity = (int)Math.Floor(barWidth / 11);
                        string display = task.Title ?? String.Empty;
                        if (display.Length > capacity) display = display.Substring(0, Math.Max(2, capacity - 1)) + "…";
                        result.Tasks.Add(new TaskLayout
                        {
                            Source = task,
                            Bar = new Box(barLeft, barTop, barWidth, taskBarHeight),
                            DisplayTitle = display,
                            FillColor = color.Fill,
                            LineColor = color.Line,
                            TextColor = color.Text,
                            FontSize = overview ? 8 : (barWidth < 50 ? 8 : 9)
                        });
                    }
                }
            }
            return result;
        }

        private static bool TryDate(string value, out DateTime date) { return DateTime.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out date); }
        private static DateTime Parse(string value) { return DateTime.ParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture); }
    }
}
