using System;
using System.Collections.Generic;
using System.Globalization;
using System.Runtime.Serialization;

namespace Tempo.TimelineAddin
{
    [DataContract]
    public sealed class TimelineData
    {
        [DataMember(Order = 1)] public string Title { get; set; }
        [DataMember(Order = 2)] public string Density { get; set; }
        [DataMember(Order = 3)] public List<LaneData> Lanes { get; set; }
        [DataMember(Order = 4)] public List<TaskData> Tasks { get; set; }

        public TimelineData()
        {
            Title = "新建时间线";
            Density = "detailed";
            Lanes = new List<LaneData>();
            Tasks = new List<TaskData>();
        }

        public static TimelineData CreateSample()
        {
            var data = new TimelineData { Title = "Q4 产品发布", Density = "detailed" };
            data.Lanes.Add(new LaneData { Id = "research", Name = "研究与策略", Subtitle = "对齐问题与方向", Icon = "⌕", Tone = "green" });
            data.Lanes.Add(new LaneData { Id = "design", Name = "产品设计", Subtitle = "体验与视觉系统", Icon = "✳", Tone = "violet" });
            data.Lanes.Add(new LaneData { Id = "build", Name = "工程开发", Subtitle = "构建核心体验", Icon = "⌘", Tone = "blue" });
            data.Lanes.Add(new LaneData { Id = "launch", Name = "发布与增长", Subtitle = "测试、上线与复盘", Icon = "↗", Tone = "peach" });
            data.Tasks.Add(new TaskData { Id = "e1", Title = "竞品扫描", Start = "2026-10-27", End = "2026-11-06", Lane = "research", Color = "green", Status = "done" });
            data.Tasks.Add(new TaskData { Id = "e2", Title = "定位与范围确认", Start = "2026-11-09", End = "2026-11-20", Lane = "research", Color = "green", Status = "done" });
            data.Tasks.Add(new TaskData { Id = "e3", Title = "用户旅程与流程图", Start = "2026-11-16", End = "2026-11-27", Lane = "design", Color = "violet", Status = "active" });
            data.Tasks.Add(new TaskData { Id = "e4", Title = "视觉方向探索", Start = "2026-11-23", End = "2026-12-04", Lane = "design", Color = "violet", Status = "active" });
            data.Tasks.Add(new TaskData { Id = "e5", Title = "设计系统搭建", Start = "2026-12-01", End = "2026-12-18", Lane = "design", Color = "violet", Status = "planned" });
            data.Tasks.Add(new TaskData { Id = "e6", Title = "数据模型与 API", Start = "2026-12-08", End = "2026-12-18", Lane = "build", Color = "blue", Status = "planned" });
            data.Tasks.Add(new TaskData { Id = "e7", Title = "核心功能开发", Start = "2026-12-14", End = "2027-01-15", Lane = "build", Color = "blue", Status = "planned" });
            data.Tasks.Add(new TaskData { Id = "e8", Title = "封闭测试", Start = "2027-01-18", End = "2027-01-29", Lane = "launch", Color = "peach", Status = "planned" });
            data.Tasks.Add(new TaskData { Id = "e9", Title = "公开发布", Start = "2027-02-02", End = "2027-02-02", Lane = "launch", Color = "yellow", Status = "planned", Milestone = true });
            return data;
        }

        public List<string> Validate()
        {
            var errors = new List<string>();
            if (String.IsNullOrWhiteSpace(Title)) errors.Add("时间线标题不能为空。");
            if (Lanes == null || Lanes.Count == 0) errors.Add("时间线至少需要包含一条泳道。");
            if (Tasks == null || Tasks.Count == 0) errors.Add("时间线至少需要包含一项任务或里程碑。");
            if (Lanes != null)
            {
                var ids = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var lane in Lanes)
                {
                    if (lane == null || String.IsNullOrWhiteSpace(lane.Id) || String.IsNullOrWhiteSpace(lane.Name))
                        errors.Add("每条泳道都需要填写唯一标识和名称。");
                    else if (!ids.Add(lane.Id.Trim())) errors.Add("泳道标识不能重复：" + lane.Id);
                }
            }
            if (Tasks != null)
            {
                foreach (var task in Tasks)
                {
                    if (task == null || String.IsNullOrWhiteSpace(task.Title))
                    {
                        errors.Add("每项任务都需要填写名称。");
                        continue;
                    }
                    DateTime start, end;
                    if (!DateTime.TryParseExact(task.Start, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out start))
                    {
                        errors.Add("任务“" + task.Title + "”的开始日期必须为 YYYY-MM-DD。");
                        continue;
                    }
                    if (!DateTime.TryParseExact(task.End, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out end))
                    {
                        errors.Add("任务“" + task.Title + "”的结束日期必须为 YYYY-MM-DD。");
                        continue;
                    }
                    if (!task.Milestone && end < start) errors.Add("任务“" + task.Title + "”的结束日期不能早于开始日期。");
                    if (Lanes != null && !LaneExists(task.Lane)) errors.Add("任务“" + task.Title + "”引用了不存在的泳道。");
                    if (!TimelineColors.Contains(task.Color)) errors.Add("任务“" + task.Title + "”的色彩无效（green/violet/blue/peach/yellow/gray）。");
                }
            }
            return errors;
        }

        private bool LaneExists(string laneId)
        {
            foreach (var lane in Lanes) if (lane != null && String.Equals(lane.Id, laneId, StringComparison.OrdinalIgnoreCase)) return true;
            return false;
        }
    }

    [DataContract]
    public sealed class LaneData
    {
        [DataMember(Order = 1)] public string Id { get; set; }
        [DataMember(Order = 2)] public string Name { get; set; }
        [DataMember(Order = 3)] public string Subtitle { get; set; }
        [DataMember(Order = 4)] public string Icon { get; set; }
        [DataMember(Order = 5)] public string Tone { get; set; }
    }

    [DataContract]
    public sealed class TaskData
    {
        [DataMember(Order = 1)] public string Id { get; set; }
        [DataMember(Order = 2)] public string Title { get; set; }
        [DataMember(Order = 3)] public string Start { get; set; }
        [DataMember(Order = 4)] public string End { get; set; }
        [DataMember(Order = 5)] public string Lane { get; set; }
        [DataMember(Order = 6)] public string Color { get; set; }
        [DataMember(Order = 7)] public string Status { get; set; }
        [DataMember(Order = 8)] public bool Milestone { get; set; }
    }

    internal sealed class TimelineColor
    {
        public string Fill;
        public string Line;
        public string Text;

        public TimelineColor(string fill, string line, string text) { Fill = fill; Line = line; Text = text; }
    }

    internal static class TimelineColors
    {
        private static readonly Dictionary<string, TimelineColor> Colors = new Dictionary<string, TimelineColor>(StringComparer.OrdinalIgnoreCase)
        {
            { "green", new TimelineColor("#E7EFE7", "#4D6B52", "#3D5945") },
            { "violet", new TimelineColor("#EDE9F8", "#7463A6", "#5C4E8A") },
            { "blue", new TimelineColor("#E5EEF7", "#4C769D", "#365C80") },
            { "peach", new TimelineColor("#F7E9E1", "#A9684A", "#884E34") },
            { "yellow", new TimelineColor("#F5EFD5", "#927A3D", "#766129") },
            { "gray", new TimelineColor("#EEEFEB", "#6F736A", "#51554C") }
        };
        public static bool Contains(string id) { return !String.IsNullOrWhiteSpace(id) && Colors.ContainsKey(id); }
        public static TimelineColor Get(string id)
        {
            TimelineColor color;
            return !String.IsNullOrWhiteSpace(id) && Colors.TryGetValue(id, out color) ? color : Colors["green"];
        }
    }
}
