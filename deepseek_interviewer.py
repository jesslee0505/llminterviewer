# Import necessary libraries
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
import torch
import gradio as gr

# Option 1: Load model using pipeline (simpler but less customizable)
def load_pipeline():
    pipe = pipeline(
        "text-generation", 
        model="deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
        torch_dtype=torch.float16,
        device_map="auto"
    )
    return pipe

# Option 2: Load model directly (more customizable)
def load_model_directly():
    tokenizer = AutoTokenizer.from_pretrained("deepseek-ai/DeepSeek-R1-Distill-Qwen-7B")
    model = AutoModelForCausalLM.from_pretrained(
        "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
        torch_dtype=torch.float16,
        device_map="auto"
    )
    return tokenizer, model

# Function to generate responses using pipeline
def generate_with_pipeline(pipe, prompt, max_length=1024, temperature=0.7):
    response = pipe(
        prompt,
        max_length=max_length,
        temperature=temperature,
        do_sample=True,
        top_p=0.9,
        repetition_penalty=1.1,
        return_full_text=False
    )[0]['generated_text']
    return response.strip()

# Function to generate responses using direct model
def generate_with_model(tokenizer, model, prompt, max_length=1024, temperature=0.7):
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    
    with torch.no_grad():
        outputs = model.generate(
            inputs.input_ids,
            max_length=max_length,
            temperature=temperature,
            do_sample=True,
            top_p=0.9,
            repetition_penalty=1.1
        )
    
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    response = response[len(tokenizer.decode(inputs.input_ids[0], skip_special_tokens=True)):]
    return response.strip()

# Construct the system prompt for the interviewer
def create_interview_prompt(problem, code_so_far, candidate_thoughts=""):
    interviewer_prompt = """# Technical Interviewer for LeetCode and SQL

You are a Senior Technical Engineer conducting a technical interview for a full time data science position or MLE position. Your goal is to evaluate the candidate's problem-solving abilities, algorithm knowledge, and SQL skills while providing a realistic interview experience. You have access to:

1. The problem the candidate is solving
2. The candidate's code in real-time
3. What the candidate is saying out loud (their thought process)

## Your Responsibilities:

### Interview Structure
- Start by introducing yourself briefly and explaining the interview format
- Present one problem at a time, starting with easier problems before moving to more challenging ones
- Allow the candidate time to think and solve each problem
- Guide the interview through topics relevant to algorithmic problem-solving and SQL queries
- End with a brief summary of the candidate's performance

### During Problem-Solving
- Observe the candidate's approach without immediately jumping to help
- Provide hints ONLY when:
  - The candidate is stuck for more than 3-5 minutes
  - They explicitly ask for guidance
  - They're going down a completely wrong path
- Hints should be incremental, starting with general guidance and becoming more specific if needed
- Ask clarifying questions about their approach
- Occasionally ask "why" questions to understand their reasoning

### Evaluation Criteria
Assess the candidate on:
1. **Algorithm knowledge**: Understanding of data structures, time/space complexity, and common algorithms
2. **Problem-solving approach**: How they break down and tackle problems
3. **Code quality**: Clarity, efficiency, and correctness
4. **Communication**: Ability to explain their thought process
5. **Error handling**: How they identify and fix bugs
6. **Edge case consideration**: How well they identify and handle edge cases

### Types of Problems to Present
- Array and string manipulation
- Binary search and sorting algorithms
- Tree and graph traversals
- Dynamic programming
- Recursion and backtracking
- Hash tables and set operations
- SQL queries covering:
  - JOINs (INNER, LEFT, RIGHT)
  - Aggregation functions (COUNT, SUM, AVG)
  - GROUP BY and HAVING clauses
  - Window functions
  - Subqueries and CTEs
  - CASE statements and conditional logic

## Communication Guidelines:

### Be Authentic
- Speak professionally but conversationally
- React to their approaches in a realistic way
- Ask follow-up questions as a real interviewer would
- Express appropriate reactions to solutions (impressed by clever solutions, curious about unconventional approaches)

### Provide Balanced Feedback
- Acknowledge good approaches and solutions
- Point out potential issues or inefficiencies tactfully
- Suggest alternative approaches after they've completed their solution
- Balance positive and constructive feedback

### Simulate Real Interview Dynamics
- Occasionally introduce time constraints: "We have about 10 minutes left for this problem"
- Ask the candidate to optimize their initial solution
- Propose slight variations to the problem to test adaptability
- For SQL problems, ask about query optimization or handling larger datasets

## Common Scenarios and How to Respond:

### When the candidate is stuck:
First ask: "What are you thinking right now?" or "Can you talk me through your current approach?"
Then provide incremental hints:
1. First hint: Point to relevant algorithms or data structures without direct solutions
2. Second hint: Suggest a possible approach or optimization
3. Final hint: Give more specific guidance while still requiring them to implement

### When the candidate's solution is suboptimal:
1. Let them finish their implementation
2. Ask: "Do you see any ways to improve this solution?"
3. Guide them to consider time/space complexity, edge cases, or optimization techniques

### When the candidate makes a mistake:
1. Give them time to catch it themselves
2. If they don't notice, ask targeted questions: "What would happen if we input [specific edge case]?"
3. Only point out the error directly if they still don't see it after hints

Remember, your goal is not to trick the candidate but to effectively evaluate their skills while providing a realistic and educational interview experience that focuses specifically on LeetCode-style algorithm problems and SQL queries.

## CURRENT INTERVIEW STATUS:

Problem:
{}

Candidate's current code:
{}

Candidate's verbalized thoughts:
{}

As the interviewer, provide your next response:
"""
    return interviewer_prompt.format(problem, code_so_far, candidate_thoughts)

# Create a Gradio interface using pipeline
def create_interface_with_pipeline():
    pipe = load_pipeline()
    
    with gr.Blocks(title="LLM Technical Interviewer") as demo:
        gr.Markdown("# LLM Technical Interviewer")
        gr.Markdown("Practice technical interviews with an AI interviewer focused on LeetCode and SQL problems")
        
        with gr.Tab("Interview Session"):
            problem_input = gr.Textbox(label="Problem Description", lines=5)
            
            with gr.Row():
                code_input = gr.Code(language="python", label="Your Code", lines=15)
                thoughts_input = gr.Textbox(label="Your Thoughts (speak aloud)", lines=15)
            
            submit_btn = gr.Button("Get Interviewer Feedback")
            interviewer_output = gr.Textbox(label="Interviewer Response", lines=10)
            
            submit_btn.click(
                fn=lambda problem, code, thoughts: generate_with_pipeline(
                    pipe,
                    create_interview_prompt(problem, code, thoughts)
                ),
                inputs=[problem_input, code_input, thoughts_input],
                outputs=interviewer_output
            )
        
        with gr.Tab("About"):
            gr.Markdown("""
            ## About This Project
            
            The LLM Technical Interviewer is designed to simulate technical interviews. It uses the DeepSeek-R1-Distill-Qwen-7B model to guide users through coding, algorithmic, and SQL problems while providing real-time feedback.
            
            The platform offers a structured mock interview experience that closely mimics what you might face in a real technical assessment, rather than just providing static coding questions.
            
            ### How to Use
            
            1. Enter a LeetCode-style problem or SQL query challenge in the Problem Description box
            2. Write your code solution in the Code editor
            3. Type what you're thinking as you solve the problem in the Thoughts box
            4. Click "Get Interviewer Feedback" to receive guidance from the AI interviewer
            
            The interviewer will provide hints when needed, ask clarifying questions, and evaluate your approach.
            """)
    
    return demo

# Create a Gradio interface using direct model loading
def create_interface_with_model():
    tokenizer, model = load_model_directly()
    
    with gr.Blocks(title="LLM Technical Interviewer") as demo:
        gr.Markdown("# LLM Technical Interviewer")
        gr.Markdown("Practice technical interviews with an AI interviewer focused on LeetCode and SQL problems")
        
        with gr.Tab("Interview Session"):
            problem_input = gr.Textbox(label="Problem Description", lines=5)
            
            with gr.Row():
                code_input = gr.Code(language="python", label="Your Code", lines=15)
                thoughts_input = gr.Textbox(label="Your Thoughts (speak aloud)", lines=15)
            
            submit_btn = gr.Button("Get Interviewer Feedback")
            interviewer_output = gr.Textbox(label="Interviewer Response", lines=10)
            
            submit_btn.click(
                fn=lambda problem, code, thoughts: generate_with_model(
                    tokenizer,
                    model,
                    create_interview_prompt(problem, code, thoughts)
                ),
                inputs=[problem_input, code_input, thoughts_input],
                outputs=interviewer_output
            )
        
        with gr.Tab("About"):
            gr.Markdown("""
            ## About This Project
            
            The LLM Technical Interviewer is designed to simulate technical interviews. It uses the DeepSeek-R1-Distill-Qwen-7B model to guide users through coding, algorithmic, and SQL problems while providing real-time feedback.
            
            The platform offers a structured mock interview experience that closely mimics what you might face in a real technical assessment, rather than just providing static coding questions.
            
            ### How to Use
            
            1. Enter a LeetCode-style problem or SQL query challenge in the Problem Description box
            2. Write your code solution in the Code editor
            3. Type what you're thinking as you solve the problem in the Thoughts box
            4. Click "Get Interviewer Feedback" to receive guidance from the AI interviewer
            
            The interviewer will provide hints when needed, ask clarifying questions, and evaluate your approach.
            """)
    
    return demo

# Launch the interface (choose one of these methods)
if __name__ == "__main__":
    # Option 1: Using pipeline
    demo = create_interface_with_pipeline()
    # Option 2: Using direct model loading
    # demo = create_interface_with_model()
    demo.launch()