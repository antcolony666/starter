using System;
using System.Globalization;
using Microsoft.Office.Core;
using PowerPoint = Microsoft.Office.Interop.PowerPoint;

namespace Tempo.TimelineAddin
{
    internal static class PowerPointTimelineRenderer
    {
        public static int Insert(PowerPoint.Application application, TimelineData data)
        {
            var errors = data.Validate();
            if (errors.Count > 0) throw new InvalidOperationException(String.Join("\r\n", errors.ToArray()));
            var layout = TimelineLayoutEngine.Calculate(data, String.Equals(data.Density, "overview", StringComparison.OrdinalIgnoreCase));
            PowerPoint.Slide slide = GetActiveSlide(application);
            double scaleX = application.ActivePresentation.PageSetup.SlideWidth / layout.Width;
            double scaleY = application.ActivePresentation.PageSetup.SlideHeight / layout.Height;
            int count = 0;

            AddText(slide, layout.Title, layout.TitleBox, 18, "#20211F", true, scaleX, scaleY); count++;
            AddText(slide, layout.Subtitle, new Box(layout.TitleBox.Left, layout.TitleBox.Top + 26, layout.TitleBox.Width, 18), 9, "#858780", false, scaleX, scaleY); count++;
            foreach (var month in layout.Months)
            {
                PowerPoint.Shape shape = AddShape(slide, Office.MsoAutoShapeType.msoShapeRectangle, month.Box, scaleX, scaleY);
                SetFill(shape, "#FBFBF9"); SetLine(shape, "#E9EAE5", .5f);
                SetShapeText(shape, month.Label, 9, "#555851", true); count++;
            }
            foreach (var week in layout.Weeks)
            {
                AddText(slide, week.Label, week.Box, 8, "#969990", false, scaleX, scaleY); count++;
            }
            foreach (var lane in layout.Lanes)
            {
                PowerPoint.Shape background = AddShape(slide, Office.MsoAutoShapeType.msoShapeRectangle, lane.Background, scaleX, scaleY);
                SetFill(background, lane.BackgroundColor); SetLine(background, lane.BorderColor, .75f); count++;
                string label = String.Format("{0}  {1}\r\n{2}", String.IsNullOrWhiteSpace(lane.Source.Icon) ? "•" : lane.Source.Icon, lane.Source.Name, lane.Source.Subtitle ?? String.Empty);
                AddText(slide, label, lane.Label, 10, "#3D5945", true, scaleX, scaleY); count++;
            }
            foreach (var task in layout.Tasks)
            {
                PowerPoint.Shape shape = AddShape(slide, Office.MsoAutoShapeType.msoShapeRoundedRectangle, task.Bar, scaleX, scaleY);
                SetFill(shape, task.FillColor); SetLine(shape, task.LineColor, 1f);
                SetShapeText(shape, task.DisplayTitle, task.FontSize, task.TextColor, false); count++;
            }
            foreach (var milestone in layout.Milestones)
            {
                PowerPoint.Shape diamond = AddShape(slide, Office.MsoAutoShapeType.msoShapeDiamond, milestone.Diamond, scaleX, scaleY);
                SetFill(diamond, milestone.LineColor); SetLine(diamond, milestone.LineColor, 1f); count++;
                AddText(slide, milestone.Source.Title, milestone.Label, milestone.FontSize, milestone.TextColor, true, scaleX, scaleY); count++;
            }
            return count;
        }

        private static PowerPoint.Slide GetActiveSlide(PowerPoint.Application application)
        {
            try
            {
                PowerPoint.Slide slide = application.ActiveWindow.View.Slide as PowerPoint.Slide;
                if (slide != null) return slide;
            }
            catch { }
            try
            {
                PowerPoint.Selection selection = application.ActiveWindow.Selection;
                if (selection.Type == PowerPoint.PpSelectionType.ppSelectionSlides && selection.SlideRange.Count > 0)
                    return selection.SlideRange[1];
            }
            catch { }
            throw new InvalidOperationException("未能获取当前幻灯片。请在 PowerPoint 普通视图中先选中一页幻灯片，再重试。");
        }

        private static PowerPoint.Shape AddShape(PowerPoint.Slide slide, Office.MsoAutoShapeType type, Box box, double sx, double sy)
        {
            return slide.Shapes.AddShape(type, (float)(box.Left * sx), (float)(box.Top * sy), (float)(box.Width * sx), (float)(box.Height * sy));
        }

        private static void AddText(PowerPoint.Slide slide, string text, Box box, float fontSize, string color, bool bold, double sx, double sy)
        {
            PowerPoint.Shape shape = slide.Shapes.AddTextbox(Office.MsoTextOrientation.msoTextOrientationHorizontal, (float)(box.Left * sx), (float)(box.Top * sy), (float)(box.Width * sx), (float)(box.Height * sy));
            shape.Fill.Visible = Office.MsoTriState.msoFalse;
            shape.Line.Visible = Office.MsoTriState.msoFalse;
            SetShapeText(shape, text, fontSize, color, bold);
        }

        private static void SetShapeText(PowerPoint.Shape shape, string text, float fontSize, string color, bool bold)
        {
            shape.TextFrame.TextRange.Text = text ?? String.Empty;
            shape.TextFrame.WordWrap = Office.MsoTriState.msoTrue;
            shape.TextFrame.MarginLeft = 3;
            shape.TextFrame.MarginRight = 3;
            shape.TextFrame.MarginTop = 1;
            shape.TextFrame.MarginBottom = 1;
            PowerPoint.Font font = shape.TextFrame.TextRange.Font;
            font.Name = "Microsoft YaHei";
            font.Size = fontSize;
            font.Bold = bold ? Office.MsoTriState.msoTrue : Office.MsoTriState.msoFalse;
            font.Color.RGB = ToOfficeRgb(color);
        }

        private static void SetFill(PowerPoint.Shape shape, string color)
        {
            shape.Fill.Visible = Office.MsoTriState.msoTrue;
            shape.Fill.Solid();
            shape.Fill.ForeColor.RGB = ToOfficeRgb(color);
        }

        private static void SetLine(PowerPoint.Shape shape, string color, float weight)
        {
            shape.Line.Visible = Office.MsoTriState.msoTrue;
            shape.Line.ForeColor.RGB = ToOfficeRgb(color);
            shape.Line.Weight = weight;
        }

        private static int ToOfficeRgb(string hex)
        {
            string value = (hex ?? "#000000").Trim().TrimStart('#');
            int red = Int32.Parse(value.Substring(0, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture);
            int green = Int32.Parse(value.Substring(2, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture);
            int blue = Int32.Parse(value.Substring(4, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture);
            return red | (green << 8) | (blue << 16);
        }
    }
}
